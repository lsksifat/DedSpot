import { db, publicSpotColumns } from '@/lib/db';
import { submitSpotSchema } from '@/lib/validation';
import { getClientIp, hashIp, jsonError } from '@/lib/security';
import { rateLimit } from '@/lib/rate-limit';
import type { Spot } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const clamp = (n: number, lo: number, hi: number, dflt: number) =>
  Number.isFinite(n) ? Math.min(Math.max(n, lo), hi) : dflt;

// GET /api/spots?q=&city=&category=&limit=&offset=  — browse approved spots
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const q = (p.get('q') || '').trim().slice(0, 80);
  const city = (p.get('city') || '').trim().slice(0, 80);
  const category = (p.get('category') || '').trim().slice(0, 40);
  const limit = clamp(Number(p.get('limit')), 1, 100, 30);
  const offset = clamp(Number(p.get('offset')), 0, 100000, 0);

  try {
    const sql = db();
    const spots = await sql<Spot[]>`
      SELECT ${publicSpotColumns(sql)},
        (SELECT ROUND(AVG(rating), 1)::float FROM spot_reviews r
           WHERE r.spot_id = wifi_spots.id AND r.status = 'approved') AS avg_rating,
        (SELECT COUNT(*)::int FROM spot_reviews r
           WHERE r.spot_id = wifi_spots.id AND r.status = 'approved') AS reviews_count
      FROM wifi_spots
      WHERE status = 'approved'
        ${q ? sql`AND name ILIKE ${'%' + q + '%'}` : sql``}
        ${city ? sql`AND city ILIKE ${city}` : sql``}
        ${category ? sql`AND category = ${category}` : sql``}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    return Response.json({ count: spots.length, spots });
  } catch (err) {
    console.error('list query failed:', err);
    return jsonError('Could not fetch spots.', 500);
  }
}

// POST /api/spots — submit a new spot (enters the moderation queue as 'pending')
export async function POST(req: Request) {
  const ip = getClientIp(req);
  const limit = rateLimit(`submit:${hashIp(ip)}`, 5, 10 * 60 * 1000);
  if (!limit.ok) {
    return jsonError('Too many submissions. Please try again later.', 429, {
      retryAfterSec: limit.retryAfterSec,
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError('Invalid JSON body.', 400);
  }

  // Honeypot: silently accept (but drop) obvious bot submissions.
  if (body && typeof body === 'object' && (body as Record<string, unknown>).website_url) {
    return Response.json({ ok: true, status: 'pending' });
  }

  const parsed = submitSpotSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError('Please check the form fields.', 422, {
      issues: parsed.error.flatten().fieldErrors,
    });
  }
  const s = parsed.data;

  try {
    const sql = db();
    const [row] = await sql<{ id: number }[]>`
      INSERT INTO wifi_spots (
        source, name, category, lat, lng, address, area, city, district,
        is_free, access_type, password_is_public, wifi_password, speed_mbps,
        owner_name, owner_type, why_free,
        has_power, has_seating, is_quiet, hours,
        lighting, crowd_level, has_cctv, staff_present, family_friendly,
        status, submitter_ip_hash
      ) VALUES (
        'user', ${s.name}, ${s.category}, ${s.lat}, ${s.lng},
        ${s.address ?? null}, ${s.area ?? null}, ${s.city ?? null}, ${s.district ?? null},
        ${s.is_free}, ${s.access_type}, ${s.password_is_public}, ${s.wifi_password ?? null},
        ${s.speed_mbps ?? null}, ${s.owner_name ?? null}, ${s.owner_type}, ${s.why_free ?? null},
        ${s.has_power}, ${s.has_seating}, ${s.is_quiet}, ${s.hours ?? null},
        ${s.lighting}, ${s.crowd_level}, ${s.has_cctv}, ${s.staff_present}, ${s.family_friendly},
        'pending', ${hashIp(ip)}
      ) RETURNING id
    `;
    return Response.json(
      { ok: true, id: row!.id, status: 'pending', message: 'Thanks! Your spot will appear after a quick review.' },
      { status: 201 },
    );
  } catch (err) {
    console.error('insert spot failed:', err);
    return jsonError('Could not save your spot. Please try again.', 500);
  }
}
