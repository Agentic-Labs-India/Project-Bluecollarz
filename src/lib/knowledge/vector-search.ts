import {
  KNOWLEDGE_VECTOR_INDEX,
  type KnowledgeDocType,
  type KnowledgeHit,
} from "@/lib/knowledge/types";

export type VectorSearchFilter = {
  docType?: KnowledgeDocType;
  source?: string;
};

export function vectorSearchStages(opts: {
  queryVector: number[];
  limit: number;
  filter?: VectorSearchFilter;
}): Record<string, unknown>[] {
  const filter: Record<string, string> = {};
  if (opts.filter?.docType) filter.docType = opts.filter.docType;
  if (opts.filter?.source) filter.source = opts.filter.source;

  return [
    {
      $vectorSearch: {
        index: KNOWLEDGE_VECTOR_INDEX,
        path: "embedding",
        queryVector: opts.queryVector,
        numCandidates: Math.max(40, opts.limit * 8),
        limit: opts.limit,
        ...(Object.keys(filter).length ? { filter } : {}),
      },
    },
    {
      $project: {
        _id: 0,
        text: 1,
        source: 1,
        docType: 1,
        page: 1,
        chunkIndex: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
  ];
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let left = 0;
  let right = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    left += x * x;
    right += y * y;
  }
  const denom = Math.sqrt(left) * Math.sqrt(right);
  return denom === 0 ? 0 : dot / denom;
}

export function rankByEmbedding(opts: {
  queryVector: number[];
  docs: Array<{
    text: string;
    source: string;
    docType: KnowledgeDocType;
    page: number;
    chunkIndex: number;
    embedding: number[];
  }>;
  limit: number;
}): KnowledgeHit[] {
  return opts.docs
    .map((doc) => ({
      text: doc.text,
      source: doc.source,
      docType: doc.docType,
      page: doc.page,
      chunkIndex: doc.chunkIndex,
      score: cosineSimilarity(opts.queryVector, doc.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.limit);
}
