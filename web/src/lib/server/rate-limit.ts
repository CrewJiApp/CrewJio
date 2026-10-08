import "server-only";

// Basic fixed-window limiter, kept in memory per server instance. On Vercel each
// instance has its own memory, so this slows down bursts from one IP rather than
// enforcing a hard global cap. Swap for Upstash or Vercel KV if spam gets real.

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 10;
const hits = new Map<string, { count: number; resetAt: number }>();

export function isRateLimited(key: string, now = Date.now()): boolean {
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  }
  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}
