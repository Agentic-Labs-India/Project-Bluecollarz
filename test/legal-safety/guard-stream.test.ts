import { describe, expect, test } from "bun:test";
import type { TextStreamPart, ToolSet } from "ai";
import {
  GUARD_FALLBACK,
  guardText,
  prohibitedOutputGuard,
} from "@/lib/legal-safety/guard-stream";

type Part = TextStreamPart<ToolSet>;

/** Split into small chunks so the guard sees a realistic token stream. */
function deltas(id: string, text: string, size = 4): Part[] {
  const parts: Part[] = [];
  for (let index = 0; index < text.length; index += size) {
    parts.push({
      type: "text-delta",
      id,
      text: text.slice(index, index + size),
    });
  }
  return parts;
}

async function run(parts: Part[]): Promise<string> {
  const transform = prohibitedOutputGuard({ surface: "test" })();
  const writer = transform.writable.getWriter();
  const reader = transform.readable.getReader();

  const collected: string[] = [];
  const draining = (async () => {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value.type === "text-delta") collected.push(value.text);
    }
  })();

  for (const part of parts) await writer.write(part);
  await writer.close();
  await draining;
  return collected.join("");
}

describe("streaming output guard", () => {
  test("passes clean text through unchanged", async () => {
    const text =
      "I cannot confirm whether this offer is real. A person from our team will review it.";
    const output = await run([
      { type: "text-start", id: "m1" },
      ...deltas("m1", text),
      { type: "text-end", id: "m1" },
    ]);
    expect(output).toBe(text);
  });

  test("blocks a prohibited determination split across tokens", async () => {
    const output = await run([
      { type: "text-start", id: "m1" },
      ...deltas("m1", "Good news. Your offer letter is genuine and safe."),
      { type: "text-end", id: "m1" },
    ]);
    expect(output).toContain(GUARD_FALLBACK);
    expect(output).not.toContain("is genuine");
  });

  test("nothing further is released after a violation", async () => {
    const output = await run([
      { type: "text-start", id: "m1" },
      ...deltas("m1", "We guarantee you a job. Please send your passport."),
      { type: "text-end", id: "m1" },
    ]);
    expect(output).not.toContain("passport");
  });

  test("a violation in the final clause is caught without a terminator", async () => {
    const output = await run([
      { type: "text-start", id: "m1" },
      ...deltas("m1", "One moment. 100% job placement for you"),
      { type: "text-end", id: "m1" },
    ]);
    expect(output).toContain(GUARD_FALLBACK);
    expect(output).not.toContain("100%");
  });

  test("an unterminated clean tail is still delivered", async () => {
    const output = await run([
      { type: "text-start", id: "m1" },
      ...deltas("m1", "Your application is submitted"),
      { type: "text-end", id: "m1" },
    ]);
    expect(output).toBe("Your application is submitted");
  });

  test("Hindi output is guarded too", async () => {
    const output = await run([
      { type: "text-start", id: "m1" },
      ...deltas("m1", "सुनिए। यह नौकरी सुरक्षित है।"),
      { type: "text-end", id: "m1" },
    ]);
    expect(output).toContain(GUARD_FALLBACK);
    expect(output).not.toContain("सुरक्षित है");
  });

  test("guardText replaces non-streamed violations", () => {
    expect(guardText("We guarantee you a visa.", "test")).toBe(GUARD_FALLBACK);
    expect(guardText("Your interview is scheduled.", "test")).toBe(
      "Your interview is scheduled.",
    );
  });
});
