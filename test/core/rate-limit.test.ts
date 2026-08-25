import { describe, expect, test } from "bun:test";
import { evaluateLimit, tickWindow } from "@/lib/core/rate-limit";

describe("tickWindow", () => {
  test("starts a new window when empty", () => {
    expect(tickWindow(null, 1000, 60_000)).toEqual({
      count: 1,
      resetAt: 61_000,
    });
  });

  test("starts a new window when the previous one expired", () => {
    expect(tickWindow({ count: 90, resetAt: 1000 }, 1000, 60_000)).toEqual({
      count: 1,
      resetAt: 61_000,
    });
  });

  test("increments inside the window", () => {
    expect(tickWindow({ count: 4, resetAt: 61_000 }, 5000, 60_000)).toEqual({
      count: 5,
      resetAt: 61_000,
    });
  });
});

describe("evaluateLimit", () => {
  test("allows counts at the limit", () => {
    expect(evaluateLimit({ count: 90, resetAt: 61_000 }, 90, 1000)).toEqual({
      ok: true,
      remaining: 0,
      retryAfterSeconds: 0,
    });
  });

  test("rejects counts over the limit", () => {
    const result = evaluateLimit({ count: 91, resetAt: 61_000 }, 90, 1000);
    expect(result.ok).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterSeconds).toBe(60);
  });
});
