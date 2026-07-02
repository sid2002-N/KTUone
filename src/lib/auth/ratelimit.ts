/**
 * Rate limiting using @upstash/ratelimit + @upstash/redis.
 *
 * Server-only. Used by login + refresh routes to prevent credential
 * brute-forcing and refresh-token abuse.
 *
 * Graceful no-op: when UPSTASH_REDIS_REST_URL is not set (e.g. local dev),
 * every check returns { success: true, ... } so the app keeps working without
 * a Redis instance.
 *
 * Env vars: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { NextRequest } from "next/server";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // epoch ms (matches @upstash/ratelimit v2)
}

let _loginLimiter: Ratelimit | null = null;
let _refreshLimiter: Ratelimit | null = null;

function getLimiters(): { login: Ratelimit; refresh: Ratelimit } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  if (!_loginLimiter || !_refreshLimiter) {
    const redis = new Redis({ url, token });
    _loginLimiter = new Ratelimit({
      redis,
      // 5 login attempts per 15 minutes per IP
      limiter: Ratelimit.slidingWindow(5, "15 m"),
      prefix: "ktu_one:rl:login",
      analytics: false,
    });
    _refreshLimiter = new Ratelimit({
      redis,
      // 30 refresh attempts per hour per IP
      limiter: Ratelimit.slidingWindow(30, "1 h"),
      prefix: "ktu_one:rl:refresh",
      analytics: false,
    });
  }
  return { login: _loginLimiter, refresh: _refreshLimiter };
}

const NOOP_RESULT: RateLimitResult = {
  success: true,
  limit: Number.POSITIVE_INFINITY,
  remaining: Number.POSITIVE_INFINITY,
  reset: Date.now() + 15 * 60 * 1000,
};

/**
 * Login rate limit — 5 attempts per 15 min per identifier (typically IP).
 */
export async function checkLoginRateLimit(
  identifier: string,
): Promise<RateLimitResult> {
  const limiters = getLimiters();
  if (!limiters) return NOOP_RESULT;
  const r = await limiters.login.limit(identifier);
  return {
    success: r.success,
    limit: r.limit,
    remaining: r.remaining,
    reset: r.reset,
  };
}

/**
 * Refresh rate limit — 30 attempts per hour per identifier.
 */
export async function checkRefreshRateLimit(
  identifier: string,
): Promise<RateLimitResult> {
  const limiters = getLimiters();
  if (!limiters) return NOOP_RESULT;
  const r = await limiters.refresh.limit(identifier);
  return {
    success: r.success,
    limit: r.limit,
    remaining: r.remaining,
    reset: r.reset,
  };
}

/**
 * Extract the client IP from request headers.
 *
 * Checks `x-forwarded-for` first (takes the first IP in the list — the
 * original client), then falls back to `x-real-ip`. Returns "unknown" if
 * neither is present (e.g. direct localhost access in dev).
 */
export function getRequestIp(req: NextRequest | Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri.trim();
  return "unknown";
}
