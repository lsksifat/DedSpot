import { timingSafeEqual } from 'node:crypto';
import { runIngest } from '@/lib/ingest';
import { jsonError } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Overpass can be slow; allow up to 5 min

// Protects the endpoint. Accepts either:
//   Authorization: Bearer <CRON_SECRET>
//   ?key=<CRON_SECRET>
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET || '';
  if (!secret) return false; // fail closed if unconfigured
  const url = new URL(req.url);
  const provided =
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ||
    url.searchParams.get('key') ||
    '';
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function handle(req: Request) {
  if (!authorized(req)) return jsonError('Unauthorized.', 401);
  try {
    const result = await runIngest();
    return Response.json({ ok: true, ...result });
  } catch (err) {
    console.error('cron ingest failed:', err);
    return jsonError('Ingest failed. Check server logs / ingest_runs table.', 500);
  }
}

export const GET = handle;
export const POST = handle;
