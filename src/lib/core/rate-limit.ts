import "server-only";

import client, { COLLECTIONS, DB_NAME } from "@/lib/db";

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export type WindowState = {
  count: number;
  resetAt: number;
};

/** Fixed-window increment. Shared by the Mongo store and tests. */
export function tickWindow(
  existing: WindowState | null,
  now: number,
  windowMs: number,
): WindowState {
  if (!existing || existing.resetAt <= now) {
    return { count: 1, resetAt: now + windowMs };
  }
  return { count: existing.count + 1, resetAt: existing.resetAt };
}

export function evaluateLimit(
  state: WindowState,
  limit: number,
  now: number,
): RateLimitResult {
  if (state.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((state.resetAt - now) / 1000)),
    };
  }
  return {
    ok: true,
    remaining: Math.max(0, limit - state.count),
    retryAfterSeconds: 0,
  };
}

/** Per-user budgets for endpoints that cost money on every call. */
export const AI_RATE_LIMITS = {
  stt: 90,
  tts: 90,
  interviewChat: 40,
  onboardingChat: 40,
  helpChat: 20,
  jobOverview: 10,
  consentPlayback: 20,
  knowledgeChat: 20,
} as const;

/**
 * Shared cap on the single Sarvam API key across every function instance.
 * Per-user limits still apply on top.
 */
export const SARVAM_GLOBAL_RATE_LIMITS = {
  stt: 600,
  tts: 600,
} as const;

const SARVAM_GLOBAL_KIND = {
  stt: "stt",
  tts: "tts",
  consentPlayback: "tts",
} as const;

type RateLimitDoc = {
  _id: string;
  count: number;
  resetAt: Date;
};

let ttlReady: Promise<void> | null = null;

function limitsCol() {
  return client.db(DB_NAME).collection<RateLimitDoc>(COLLECTIONS.RATE_LIMITS);
}

async function ensureTtlIndex(): Promise<void> {
  ttlReady ??= limitsCol()
    .createIndex({ resetAt: 1 }, { expireAfterSeconds: 0 })
    .then(() => undefined)
    .catch((error) => {
      ttlReady = null;
      console.warn("rate-limit TTL index:", error);
    });
  await ttlReady;
}

async function incr(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  const nowDate = new Date(now);
  const nextReset = new Date(now + windowMs);
  await ensureTtlIndex();

  const update = [
    {
      $set: {
        count: {
          $cond: [
            {
              $or: [
                { $eq: [{ $ifNull: ["$resetAt", null] }, null] },
                { $lte: ["$resetAt", nowDate] },
              ],
            },
            1,
            { $add: [{ $ifNull: ["$count", 0] }, 1] },
          ],
        },
        resetAt: {
          $cond: [
            {
              $or: [
                { $eq: [{ $ifNull: ["$resetAt", null] }, null] },
                { $lte: ["$resetAt", nowDate] },
              ],
            },
            nextReset,
            "$resetAt",
          ],
        },
      },
    },
  ];

  const run = () =>
    limitsCol().findOneAndUpdate({ _id: key }, update, {
      upsert: true,
      returnDocument: "after",
    });

  let doc: RateLimitDoc | null = null;
  try {
    doc = await run();
  } catch (error) {
    const code = (error as { code?: number }).code;
    if (code !== 11000) throw error;
    doc = await run();
  }

  const state: WindowState = {
    count: doc?.count ?? 1,
    resetAt: doc?.resetAt?.getTime() ?? now + windowMs,
  };
  return evaluateLimit(state, limit, now);
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  return incr(key, limit, windowMs);
}

export async function rateLimitPerMinute(
  route: keyof typeof AI_RATE_LIMITS,
  userId: string,
): Promise<RateLimitResult> {
  const globalKind =
    route in SARVAM_GLOBAL_KIND
      ? SARVAM_GLOBAL_KIND[route as keyof typeof SARVAM_GLOBAL_KIND]
      : null;
  if (globalKind) {
    const global = await incr(
      `global:sarvam-${globalKind}`,
      SARVAM_GLOBAL_RATE_LIMITS[globalKind],
      60_000,
    );
    if (!global.ok) return global;
  }
  return incr(`${route}:${userId}`, AI_RATE_LIMITS[route], 60_000);
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
