// Standalone CLI to ingest free-WiFi POIs from OpenStreetMap (Overpass) for
// Bangladesh. Runs without the app (good for a server cron). This mirrors
// src/lib/ingest.ts — keep the Overpass query + mapping in sync.
import { getSql } from './lib.mjs';

const BD = { minLat: 20.3, minLng: 88.0, maxLat: 26.8, maxLng: 92.8 };

// Bounding-box query (south,west,north,east) — far cheaper than an area lookup,
// which avoids 504 timeouts. Cross-border points are filtered in toRow().
const QUERY = `
[out:json][timeout:90];
( nwr["internet_access"~"wlan|yes|wifi",i](20.3,88.0,26.8,92.8); );
out center tags 5000;`;

const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

const TYPE_OFFSET = { node: 0n, way: 1_000_000_000_000_000n, relation: 2_000_000_000_000_000n };
const encodeOsmId = (t, id) => Number((TYPE_OFFSET[t] ?? 0n) + BigInt(id));

function categoryOf(t = {}) {
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

function toRow(el) {
  const tags = el.tags || {};
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

async function fetchOverpass() {
  const primary = process.env.OVERPASS_URL;
  const endpoints = primary ? [primary, ...MIRRORS.filter((m) => m !== primary)] : MIRRORS;
  let lastErr;
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
  throw lastErr ?? new Error('All Overpass endpoints failed');
}

const sql = getSql();
const [run] = await sql`INSERT INTO ingest_runs (source, status) VALUES ('osm','running') RETURNING id`;
try {
  console.log('⏳ Querying Overpass for Bangladesh WiFi POIs…');
  const elements = await fetchOverpass();
  const rows = elements.map(toRow).filter(Boolean);
  console.log(`   Got ${elements.length} elements → ${rows.length} valid spots.`);
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
  await sql`UPDATE ingest_runs SET status='success', fetched=${elements.length}, valid=${rows.length}, upserted=${upserted}, finished_at=now() WHERE id=${run.id}`;
  console.log(`✅ Upserted ${upserted} spots from OpenStreetMap.`);
} catch (err) {
  await sql`UPDATE ingest_runs SET status='error', error=${err.message}, finished_at=now() WHERE id=${run.id}`;
  console.error('❌ OSM ingest failed:', err.message);
  console.error('   (Network to Overpass may be blocked here — run on your server.)');
  process.exitCode = 1;
} finally {
  await sql.end();
}
