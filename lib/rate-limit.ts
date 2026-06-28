import "server-only";

import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const buckets = new Map<string, { count: number; resetAt: number }>();
let sharedLimiterWarningLogged = false;

export type RateLimitStore = "supabase" | "memory";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter: number;
  store: RateLimitStore;
};

export function checkRateLimit(key: string, limit = 20, windowMs = 60_000): RateLimitResult {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: Math.max(limit - 1, 0), resetAt, retryAfter: 0, store: "memory" };
  }
  const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
  if (current.count >= limit) return { allowed: false, remaining: 0, resetAt: current.resetAt, retryAfter, store: "memory" };
  current.count += 1;
  return { allowed: true, remaining: Math.max(limit - current.count, 0), resetAt: current.resetAt, retryAfter: 0, store: "memory" };
}

function normalizeLimit(limit: number) {
  return Math.max(1, Math.min(Math.floor(limit), 10_000));
}

function normalizeWindowMs(windowMs: number) {
  return Math.max(1_000, Math.min(Math.floor(windowMs), 86_400_000));
}

function fallbackRateLimit(key: string, limit: number, windowMs: number) {
  return checkRateLimit(`memory:${key}`, normalizeLimit(limit), normalizeWindowMs(windowMs));
}

export async function checkSharedRateLimit(key: string, limit = 20, windowMs = 60_000): Promise<RateLimitResult> {
  const normalizedLimit = normalizeLimit(limit);
  const normalizedWindowMs = normalizeWindowMs(windowMs);
  const supabase = createAdminClient();
  if (!supabase) return fallbackRateLimit(key, normalizedLimit, normalizedWindowMs);

  try {
    const bucketKey = createHash("sha256").update(key).digest("hex");
    const { data, error } = await supabase.rpc("check_rate_limit", {
      bucket_key: bucketKey,
      max_requests: normalizedLimit,
      window_seconds: Math.ceil(normalizedWindowMs / 1000),
    });

    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error("Shared rate limiter returned no row.");

    const resetAt = Date.parse(String(row.reset_at));
    if (!Number.isFinite(resetAt)) throw new Error("Shared rate limiter returned an invalid reset time.");

    return {
      allowed: Boolean(row.allowed),
      remaining: Math.max(Number(row.remaining) || 0, 0),
      resetAt,
      retryAfter: Math.max(Number(row.retry_after) || 0, 0),
      store: "supabase",
    };
  } catch (error) {
    if (!sharedLimiterWarningLogged) {
      sharedLimiterWarningLogged = true;
      console.warn("Shared Supabase rate limiter unavailable; falling back to local memory limiter.", error);
    }
    return fallbackRateLimit(key, normalizedLimit, normalizedWindowMs);
  }
}
