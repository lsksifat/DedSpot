import { db } from '@/lib/db';
import { reportSchema } from '@/lib/validation';
import { getClientIp, hashIp, jsonError } from '@/lib/security';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/spots/:id/report — confidential safety/accuracy report.
// These are NEVER shown publicly as raw claims; they enter a moderation queue.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return jsonError('Invalid spot id.', 400);

  const ip = getClientIp(req);
  const rl = rateLimit(`report:${hashIp(ip)}`, 10, 10 * 60 * 1000);
  if (!rl.ok) return jsonError('Too many reports. Try again later.', 429, { retryAfterSec: rl.retryAfterSec });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError('Invalid JSON body.', 400);
  }
  if (body && typeof body === 'object' && (body as Record<string, unknown>).website_url) {
    return Response.json({ ok: true }); // honeypot
  }

  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) return jsonError('Please pick a report reason.', 422);
  const r = parsed.data;

  try {
    const sql = db();
    const [spot] = await sql<{ id: number }[]>`
      SELECT id FROM wifi_spots WHERE id = ${id} LIMIT 1
    `;
    if (!spot) return jsonError('Spot not found.', 404);

    await sql`
      INSERT INTO spot_reports (spot_id, category, note, status, reporter_ip_hash)
      VALUES (${id}, ${r.category}, ${r.note ?? null}, 'pending', ${hashIp(ip)})
    `;
    return Response.json({ ok: true, message: 'Thanks for helping keep the community safe.' }, { status: 201 });
  } catch (err) {
    console.error('report insert failed:', err);
    return jsonError('Could not submit your report.', 500);
  }
}
