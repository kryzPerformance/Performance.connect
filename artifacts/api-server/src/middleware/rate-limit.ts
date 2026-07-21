/**
 * Lightweight in-memory rate limiting for the AI flyer parser.
 * Protects against runaway AI usage costs:
 *  - per-IP hourly limit (real users only need a couple of scans)
 *  - global daily cap on actual AI invocations (hard ceiling on spend)
 *
 * The per-IP check runs as middleware for early abuse rejection; the
 * global daily quota is only consumed for valid requests that actually
 * reach the AI parser (so malformed spam can't burn the daily budget).
 */

import type { Request, Response, NextFunction } from "express";

const PER_IP_LIMIT = 10; // scans per IP per hour
const PER_IP_WINDOW_MS = 60 * 60 * 1000;
const GLOBAL_DAILY_LIMIT = 200; // AI scans per day across all visitors

const ipHits = new Map<string, number[]>();
let dailyCount = 0;
let dailyResetAt = nextMidnightUtc();

function nextMidnightUtc(): number {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.getTime();
}

// Periodically prune stale IP entries so the map can't grow unbounded.
setInterval(() => {
  const cutoff = Date.now() - PER_IP_WINDOW_MS;
  for (const [ip, hits] of ipHits) {
    const recent = hits.filter((t) => t > cutoff);
    if (recent.length === 0) ipHits.delete(ip);
    else ipHits.set(ip, recent);
  }
}, 10 * 60 * 1000).unref();

/** Per-IP sliding-window limit — reject rapid-fire requests early. */
export function flyerParseRateLimit(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const now = Date.now();
  const ip = req.ip ?? "unknown";
  const cutoff = now - PER_IP_WINDOW_MS;
  const recent = (ipHits.get(ip) ?? []).filter((t) => t > cutoff);

  if (recent.length >= PER_IP_LIMIT) {
    const retryAfterSec = Math.ceil((recent[0] + PER_IP_WINDOW_MS - now) / 1000);
    res.setHeader("Retry-After", String(Math.max(1, retryAfterSec)));
    res.status(429).json({
      error:
        "Too many flyer scans — please wait a bit and try again, or fill in the details manually.",
    });
    return;
  }

  recent.push(now);
  ipHits.set(ip, recent);
  next();
}

/**
 * Consume one unit of the global daily AI quota.
 * Call only after the request body has been validated, immediately
 * before invoking the AI parser. Returns false when the cap is reached.
 */
export function consumeDailyAiQuota(): boolean {
  const now = Date.now();
  if (now >= dailyResetAt) {
    dailyCount = 0;
    dailyResetAt = nextMidnightUtc();
  }
  if (dailyCount >= GLOBAL_DAILY_LIMIT) return false;
  dailyCount += 1;
  return true;
}

/** Seconds until the daily quota resets (for Retry-After headers). */
export function secondsUntilDailyReset(): number {
  return Math.max(1, Math.ceil((dailyResetAt - Date.now()) / 1000));
}
