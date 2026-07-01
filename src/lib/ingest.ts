import { db } from './db';

// Canonical OSM ingest used by the automated cron endpoint.
// NOTE: scripts/ingest-osm.mjs is a standalone CLI mirror of this logic (so it
// can run without the app). Keep the Overpass query + mapping in sync.

const BD = { minLat: 20.3, minLng: 88.0, maxLat: 26.8, maxLng: 92.8 };

// Bounding-box query over Bangladesh (south,west,north,east). Much cheaper than
// an area/polygon lookup (avoids the 504 timeouts on the public server). Any
// stray cross-border points are filtered out in toRow() / by the DB CHECK.
const QUERY = `
[out:json][timeout:90];
( nwr["internet_access"~"wlan|yes|wifi",i](20.3,88.0,26.8,92.8); );
out center tags 5000;`;

// Public Overpass mirrors, tried in order until one succeeds.
const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

const TYPE_OFFSET: Record<string, bigint> = {
  node: 0n, way: 1_000_000_000_000_000n, relation: 2_000_000_000_000_000n,
};
const encodeOsmId = (t: string, id: number) => Number((TYPE_OFFSET[t] ?? 0n) + BigInt(id));

type Tags = Record<string, string>;
function categoryOf(t: Tags = {}): string {
  if (t.amenity === 'cafe') return 'cafe';
  if (t.amenity === 'restaurant' || t.amenity === 'fast_food') return 'restaurant';
  if (t.amenity === 'library') return 'library';
  if (t.amenity === 'university') return 'university';
  if (t.amenity === 'school' || t.amenity === 'college') return 'school';
  if (t.amenity === 'hospital' || t.amenity === 'clinic') return 'hospital';
  if (t.amenity === 'place_of_worship' && t.religion === 'muslim') return 'mosque';
  if (t.office === 'coworking' || t.amenity === 'coworking_space') return 'coworking';
  if (t.shop === 'mall' || t.shop === 'department_store') return 'mall';
  if (t.leisure === 'park') return 'park';
  if (t.public_transport || t.railway === 'station' || t.amenity === 'bus_station') return 'transport';
  if (t.office === 'government' || t.amenity === 'townhall') return 'government';
  return 'other';
}

interface Row {
  osm_id: number; name: string; category: string; lat: number; lng: number;
  area: string | null; city: string | null; district: string | null;
  is_free: boolean; hours: string | null;
}

function toRow(el: any): Row | null {
  const tags: Tags = el.tags || {};
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (lat < BD.minLat || lat > BD.maxLat || lng < BD.minLng || lng > BD.maxLng) return null;
  const fee = (tags['internet_access:fee'] || '').toLowerCase();
  const name = (tags.name || tags['name:en'] || tags.brand || '').trim() || `${categoryOf(tags)} (unnamed)`;
  return {
    osm_id: encodeOsmId(el.type, el.id),
    name: name.slice(0, 160),
    category: categoryOf(tags),
    lat, lng,
    area: tags['addr:suburb'] || tags['addr:neighbourhood'] || null,
    city: tags['addr:city'] || null,
    district: tags['addr:district'] || null,
    is_free: fee !== 'yes' && fee !== 'customers',
    hours: tags.opening_hours || null,
  };
}

async function fetchOverpass(): Promise<any[]> {
  const primary = process.env.OVERPASS_URL;
  const endpoints = primary ? [primary, ...MIRRORS.filter((m) => m !== primary)] : MIRRORS;
  let lastErr: unknown;
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        // Overpass REQUIRES a descriptive User-Agent; anonymous requests get HTTP 406.
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'DedSpot/1.0 (free WiFi finder for Bangladesh; contact: sifatbabor03@gmail.com)',
          Accept: 'application/json',
        },
        body: 'data=' + encodeURIComponent(QUERY),
        signal: AbortSignal.timeout(100_000),
      });
      if (!res.ok) {
        const detail = (await res.text().catch(() => '')).slice(0, 160);
        lastErr = new Error(`Overpass HTTP ${res.status} @ ${new URL(url).host}: ${detail}`);
        continue;
      }
      const json = await res.json();
      return Array.isArray(json.elements) ? json.elements : [];
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('All Overpass endpoints failed');
}

export interface IngestResult { runId: string; fetched: number; valid: number; upserted: number; }

export async function runIngest(): Promise<IngestResult> {
  const sql = db();
  const [run] = await sql<{ id: string }[]>`
    INSERT INTO ingest_runs (source, status) VALUES ('osm', 'running') RETURNING id::text AS id`;
  const runId = run!.id;
  try {
    const elements = await fetchOverpass();
    const rows = elements.map(toRow).filter((r): r is Row => r !== null);
    let upserted = 0;
    for (const r of rows) {
      await sql`
        INSERT INTO wifi_spots
          (source, osm_id, name, category, lat, lng, area, city, district, is_free, owner_type, hours, status, verified)
        VALUES
          ('osm', ${r.osm_id}, ${r.name}, ${r.category}, ${r.lat}, ${r.lng}, ${r.area}, ${r.city},
           ${r.district}, ${r.is_free}, 'business', ${r.hours}, 'approved', false)
        ON CONFLICT (osm_id) DO UPDATE SET
          name = EXCLUDED.name, category = EXCLUDED.category,
          lat = EXCLUDED.lat, lng = EXCLUDED.lng,
          hours = COALESCE(EXCLUDED.hours, wifi_spots.hours), updated_at = now()`;
      upserted++;
    }
    await sql`
      UPDATE ingest_runs SET status='success', fetched=${elements.length}, valid=${rows.length},
        upserted=${upserted}, finished_at=now() WHERE id=${runId}`;
    return { runId, fetched: elements.length, valid: rows.length, upserted };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await sql`UPDATE ingest_runs SET status='error', error=${msg}, finished_at=now() WHERE id=${runId}`;
    throw err;
  }
}
