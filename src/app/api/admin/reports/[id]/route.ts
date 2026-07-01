import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { jsonError } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED = ['reviewed', 'actioned', 'dismissed'] as const;

// POST /api/admin/reports/:id  body: { status: 'reviewed'|'actioned'|'dismissed' }
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await requireRole(['admin', 'moderator']);
  if (!session) return jsonError('Forbidden — admins only.', 403);

  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return jsonError('Invalid report id.', 400);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError('Invalid JSON body.', 400);
  }
  const status = (body as { status?: string })?.status ?? '';
  if (!ALLOWED.includes(status as (typeof ALLOWED)[number])) {
    return jsonError(`status must be one of: ${ALLOWED.join(', ')}.`, 400);
  }

  try {
    const sql = db();
    const [row] = await sql<{ id: string }[]>`
      UPDATE spot_reports SET status = ${status} WHERE id = ${id} RETURNING id::text AS id`;
    if (!row) return jsonError('Report not found.', 404);
    return Response.json({ ok: true, id: row.id, status });
  } catch (err) {
    console.error('admin report update failed:', err);
    return jsonError('Update failed.', 500);
  }
}
