import "server-only";

const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, limit = 20, windowMs = 60_000) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt, retryAfter: 0 };
  }
  const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
  if (current.count >= limit) return { allowed: false, remaining: 0, resetAt: current.resetAt, retryAfter };
  current.count += 1;
  return { allowed: true, remaining: limit - current.count, resetAt: current.resetAt, retryAfter };
}
