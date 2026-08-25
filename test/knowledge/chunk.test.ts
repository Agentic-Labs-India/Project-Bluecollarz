import { describe, expect, test } from "bun:test";
import { chunkPages } from "@/lib/knowledge/chunk";
import {
  knowledgeSourceKey,
  normalizeKnowledgeSource,
} from "@/lib/knowledge/types";

describe("normalizeKnowledgeSource", () => {
  test("keeps the basename", () => {
    expect(normalizeKnowledgeSource("/tmp/Contract_2024.pdf")).toBe(
      "Contract_2024.pdf",
    );
  });
});

describe("knowledgeSourceKey", () => {
  test("is case-insensitive for idempotent re-ingest", () => {
    expect(knowledgeSourceKey("Leave Policy.PDF")).toBe("leave policy.pdf");
  });
});

describe("chunkPages", () => {
  test("keeps page numbers and a global chunk index", async () => {
    const chunks = await chunkPages([
      {
        page: 1,
        text: "Clause 1. Notice is thirty days.\n\nClause 2. Pay is monthly.",
      },
      { page: 2, text: "Clause 3. Overtime needs prior approval." },
    ]);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.every((c) => c.page === 1 || c.page === 2)).toBe(true);
    expect(chunks.map((c) => c.chunkIndex)).toEqual(chunks.map((_, i) => i));
  });

  test("skips empty pages", async () => {
    const chunks = await chunkPages([
      { page: 1, text: "" },
      { page: 2, text: "Only this page has content." },
    ]);
    expect(chunks).toEqual([
      {
        text: "Only this page has content.",
        page: 2,
        chunkIndex: 0,
      },
    ]);
  });
});
