import { db } from '@/lib/db';
import { reviewSchema } from '@/lib/validation';
import { getClientIp, hashIp, jsonError } from '@/lib/security';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/spots/:id/reviews — add a rating/review to a spot.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return jsonError('Invalid spot id.', 400);

  const ip = getClientIp(req);
  const rl = rateLimit(`review:${hashIp(ip)}`, 8, 10 * 60 * 1000);
  if (!rl.ok) return jsonError('Too many reviews. Try again later.', 429, { retryAfterSec: rl.retryAfterSec });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError('Invalid JSON body.', 400);
  }
  if (body && typeof body === 'object' && (body as Record<string, unknown>).website_url) {
    return Response.json({ ok: true }); // honeypot
  }

  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError('Please check your review.', 422, { issues: parsed.error.flatten().fieldErrors });
  }
  const r = parsed.data;

  try {
    const sql = db();
    const [spot] = await sql<{ id: number }[]>`
      SELECT id FROM wifi_spots WHERE id = ${id} AND status = 'approved' LIMIT 1
    `;
    if (!spot) return jsonError('Spot not found.', 404);

    await sql`
      INSERT INTO spot_reviews (spot_id, rating, comment, audience, status, author_ip_hash)
      VALUES (${id}, ${r.rating}, ${r.comment ?? null}, ${r.audience}, 'approved', ${hashIp(ip)})
    `;
    return Response.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error('review insert failed:', err);
    return jsonError('Could not save your review.', 500);
  }
}
