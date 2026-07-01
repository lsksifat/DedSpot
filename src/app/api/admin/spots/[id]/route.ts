import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { jsonError } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/admin/spots/:id  body: { action: 'approve' | 'reject' }
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await requireRole(['admin', 'moderator']);
  if (!session) return jsonError('Forbidden — admins only.', 403);

  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return jsonError('Invalid spot id.', 400);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError('Invalid JSON body.', 400);
  }
  const action = (body as { action?: string })?.action;
  const status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : null;
  if (!status) return jsonError('action must be "approve" or "reject".', 400);

  try {
    const sql = db();
    const [row] = await sql<{ id: string }[]>`
      UPDATE wifi_spots
      SET status = ${status}, verified = ${status === 'approved'}, updated_at = now()
      WHERE id = ${id}
      RETURNING id::text AS id`;
    if (!row) return jsonError('Spot not found.', 404);
    return Response.json({ ok: true, id: row.id, status });
  } catch (err) {
    console.error('admin spot update failed:', err);
    return jsonError('Update failed.', 500);
  }
}
