// Simple in-memory sliding-window rate limiter.
// NOTE (teacher): this is per-process only. It protects a single instance and
// is perfect for the MVP. For multi-instance production, back it with Redis /
// Upstash so limits are shared across servers.

type Hit = { count: number; resetAt: number };
const store = new Map<string, Hit>();

// Occasionally evict expired keys so the map can't grow unbounded.
function sweep(now: number) {
  if (store.size < 5000) return;
  for (const [k, v] of store) if (v.resetAt <= now) store.delete(k);
}

export interface RateResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();
  sweep(now);
  const hit = store.get(key);
  if (!hit || hit.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }
  hit.count += 1;
  if (hit.count > limit) {
    return { ok: false, remaining: 0, retryAfterSec: Math.ceil((hit.resetAt - now) / 1000) };
  }
  return { ok: true, remaining: limit - hit.count, retryAfterSec: 0 };
}
