import { describe, expect, test } from "bun:test";
import { KNOWLEDGE_VECTOR_INDEX } from "@/lib/knowledge/types";
import {
  rankByEmbedding,
  vectorSearchStages,
} from "@/lib/knowledge/vector-search";

describe("vectorSearchStages", () => {
  test("builds a cosine vector search with optional filters", () => {
    const stages = vectorSearchStages({
      queryVector: [0.1, 0.2],
      limit: 5,
      filter: { docType: "legal", source: "contract.pdf" },
    });
    expect(stages[0]).toEqual({
      $vectorSearch: {
        index: KNOWLEDGE_VECTOR_INDEX,
        path: "embedding",
        queryVector: [0.1, 0.2],
        numCandidates: 40,
        limit: 5,
        filter: { docType: "legal", source: "contract.pdf" },
      },
    });
    expect(stages[1]).toMatchObject({
      $project: {
        text: 1,
        source: 1,
        page: 1,
        score: { $meta: "vectorSearchScore" },
      },
    });
  });

  test("omits filter when none are set", () => {
    const stages = vectorSearchStages({
      queryVector: [1],
      limit: 3,
    });
    const search = stages[0].$vectorSearch as Record<string, unknown>;
    expect(search.filter).toBeUndefined();
    expect(search.limit).toBe(3);
  });
});

describe("rankByEmbedding", () => {
  test("returns the closest vectors first", () => {
    const hits = rankByEmbedding({
      queryVector: [1, 0],
      limit: 1,
      docs: [
        {
          text: "far",
          source: "a.pdf",
          docType: "general",
          page: 1,
          chunkIndex: 0,
          embedding: [0, 1],
        },
        {
          text: "near",
          source: "b.pdf",
          docType: "general",
          page: 2,
          chunkIndex: 1,
          embedding: [1, 0],
        },
      ],
    });
    expect(hits).toHaveLength(1);
    expect(hits[0]?.text).toBe("near");
    expect(hits[0]?.score).toBeCloseTo(1);
  });
});
