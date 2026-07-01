import { db, publicSpotColumns } from '@/lib/db';
import { jsonError } from '@/lib/security';
import type { Spot, Review } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/spots/:id — a single approved spot plus its approved reviews.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return jsonError('Invalid spot id.', 400);

  try {
    const sql = db();
    const [spot] = await sql<Spot[]>`
      SELECT ${publicSpotColumns(sql)}
      FROM wifi_spots
      WHERE id = ${id} AND status = 'approved'
      LIMIT 1
    `;
    if (!spot) return jsonError('Spot not found.', 404);

    const reviews = await sql<Review[]>`
      SELECT id, spot_id, rating, comment, audience, created_at
      FROM spot_reviews
      WHERE spot_id = ${id} AND status = 'approved'
      ORDER BY created_at DESC
      LIMIT 50
    `;
    return Response.json({ spot, reviews });
  } catch (err) {
    console.error('spot fetch failed:', err);
    return jsonError('Could not fetch this spot.', 500);
  }
}
