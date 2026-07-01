import { db, publicSpotColumns } from '@/lib/db';
import { nearQuerySchema } from '@/lib/validation';
import { jsonError } from '@/lib/security';
import type { Spot } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/spots/near?lat=..&lng=..&radius=..&category=..&limit=..
// Returns approved spots within `radius` metres, nearest first.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = nearQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return jsonError('Invalid location or parameters.', 422, {
      issues: parsed.error.flatten().fieldErrors,
    });
  }
  const q = parsed.data;

  try {
    const sql = db();
    const catFilter = q.category ? sql`AND category = ${q.category}` : sql``;
    const spots = await sql<Spot[]>`
      SELECT ${publicSpotColumns(sql)},
        ST_Distance(geom, ST_SetSRID(ST_MakePoint(${q.lng}, ${q.lat}), 4326)::geography) AS distance_m,
        (SELECT ROUND(AVG(rating), 1)::float FROM spot_reviews r
           WHERE r.spot_id = wifi_spots.id AND r.status = 'approved') AS avg_rating,
        (SELECT COUNT(*)::int FROM spot_reviews r
           WHERE r.spot_id = wifi_spots.id AND r.status = 'approved') AS reviews_count
      FROM wifi_spots
      WHERE status = 'approved'
        AND ST_DWithin(geom, ST_SetSRID(ST_MakePoint(${q.lng}, ${q.lat}), 4326)::geography, ${q.radius})
        ${catFilter}
      ORDER BY distance_m ASC
      LIMIT ${q.limit}
    `;
    return Response.json({ count: spots.length, spots });
  } catch (err) {
    console.error('near query failed:', err);
    return jsonError('Could not fetch nearby spots.', 500);
  }
}
