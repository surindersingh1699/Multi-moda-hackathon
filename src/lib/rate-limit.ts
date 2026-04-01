import { NextRequest, NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * Simple in-memory rate limiter keyed by IP.
 * Returns null if allowed, or a 429 NextResponse if rate limited.
 */
export function rateLimit(
  req: NextRequest,
  opts: { maxRequests: number; windowMs: number }
): NextResponse | null {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const key = `${ip}:${req.nextUrl.pathname}`;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + opts.windowMs });
    return null;
  }

  entry.count++;
  if (entry.count > opts.maxRequests) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  return null;
}
