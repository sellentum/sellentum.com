import "server-only";

import { NextResponse } from "next/server";
import { checkRateLimit } from "./rate-limit";

export class PublicRequestError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function publicJsonError(message: string, status = 400, headers?: HeadersInit) {
  return NextResponse.json({ error: message }, { status, headers });
}

export function clientFingerprint(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const ip = forwarded || realIp || "local";
  return ip.replace(/[^a-zA-Z0-9:._-]/g, "").slice(0, 96) || "local";
}

export function publicRateLimit(
  request: Request,
  scope: string,
  identifier = "global",
  limit = 40,
  windowMs = 60_000,
) {
  const safeScope = scope.replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 64);
  const safeIdentifier = identifier.replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 120) || "global";
  const result = checkRateLimit(`${safeScope}:${clientFingerprint(request)}:${safeIdentifier}`, limit, windowMs);
  if (result.allowed) return null;

  return publicJsonError("Too many requests. Please try again shortly.", 429, {
    "Retry-After": String(result.retryAfter),
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": "0",
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  });
}

export async function readBoundedJson(request: Request, maxBytes = 20_000) {
  const raw = await request.text();
  if (raw.length > maxBytes) throw new PublicRequestError("Request body is too large.", 413);
  if (!raw.trim()) throw new PublicRequestError("Request body is required.", 400);

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new PublicRequestError("Request body must be valid JSON.", 400);
  }
}

function sanitizeValue(value: unknown, depth: number): unknown {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") return value.trim().slice(0, 900);
  if (Array.isArray(value)) {
    return value
      .slice(0, 30)
      .map((item) => sanitizeValue(item, depth + 1))
      .filter((item) => item !== undefined);
  }
  if (typeof value === "object" && depth < 2) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 24)
        .map(([key, item]) => [key.replace(/[^a-zA-Z0-9_.:-]/g, "_").slice(0, 80), sanitizeValue(item, depth + 1)] as const)
        .filter(([, item]) => item !== undefined),
    );
  }
  return undefined;
}

export function sanitizeAnalyticsMetadata(metadata?: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(metadata || {})
      .slice(0, 48)
      .map(([key, value]) => [key.replace(/[^a-zA-Z0-9_.:-]/g, "_").slice(0, 80), sanitizeValue(value, 0)] as const)
      .filter(([, value]) => value !== undefined),
  );
}

export function handlePublicError(error: unknown, fallback: string) {
  if (error instanceof PublicRequestError) return publicJsonError(error.message, error.status);
  return publicJsonError(fallback, 500);
}
