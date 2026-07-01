import { createHash } from 'node:crypto';

// Best-effort client IP from proxy headers. Behind Vercel/Nginx this is set;
// locally it may be empty (falls back to a constant).
export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  return req.headers.get('x-real-ip')?.trim() || '0.0.0.0';
}

// We never store raw IPs. This salted hash lets us rate-limit / trace abuse
// without holding personally identifiable data.
export function hashIp(ip: string): string {
  const salt = process.env.AUTH_SECRET || 'dedspot-dev-salt-change-me';
  return createHash('sha256').update(salt + ':' + ip).digest('hex');
}

// Standard JSON error helper for API routes.
export function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ error: message, ...extra }, { status });
}
