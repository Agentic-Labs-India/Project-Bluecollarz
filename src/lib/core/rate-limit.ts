import "server-only";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

/** Drop expired buckets so a long-lived instance does not grow unbounded. */
function sweep(now: number): void {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

/**
 * Fixed-window limiter kept in instance memory. Fluid Compute reuses instances,
 * so this reliably absorbs runaway clients, retry loops, and a single abusive
 * session on paid AI and voice endpoints. It is deliberately not a shared quota
 * across regions and is not a defence against a distributed attacker — those
 * need a central store.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((existing.resetAt - now) / 1000),
      ),
    };
  }
  return { ok: true, remaining: limit - existing.count, retryAfterSeconds: 0 };
}

/** Per-minute budgets for endpoints that cost money on every call. */
export const AI_RATE_LIMITS = {
  stt: 90,
  tts: 90,
  interviewChat: 40,
  onboardingChat: 40,
  helpChat: 20,
  jobOverview: 10,
  consentPlayback: 20,
} as const;

export function rateLimitPerMinute(
  route: keyof typeof AI_RATE_LIMITS,
  userId: string,
): RateLimitResult {
  return rateLimit(`${route}:${userId}`, AI_RATE_LIMITS[route], 60_000);
}

export function tooManyRequests(result: RateLimitResult): Response {
  return Response.json(
    { error: "Too many requests. Slow down and try again shortly." },
    {
      status: 429,
      headers: { "Retry-After": String(result.retryAfterSeconds) },
    },
  );
}
