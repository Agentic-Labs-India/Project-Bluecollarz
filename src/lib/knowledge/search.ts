import "server-only";

import { embed } from "ai";
import client, { COLLECTIONS, DB_NAME } from "@/lib/db";
import type { KnowledgeChunkDocument } from "@/lib/knowledge/store";
import type { KnowledgeHit } from "@/lib/knowledge/types";
import {
  rankByEmbedding,
  type VectorSearchFilter,
  vectorSearchStages,
} from "@/lib/knowledge/vector-search";

const FALLBACK_SCAN_CAP = 500;

function chunksCol() {
  return client
    .db(DB_NAME)
    .collection<KnowledgeChunkDocument>(COLLECTIONS.KNOWLEDGE_CHUNKS);
}

function mongoFilter(filter?: VectorSearchFilter) {
  const query: Record<string, string> = {};
  if (filter?.docType) query.docType = filter.docType;
  if (filter?.source) query.source = filter.source;
  return query;
}

async function fallbackSearch(opts: {
  queryVector: number[];
  limit: number;
  filter?: VectorSearchFilter;
}): Promise<KnowledgeHit[]> {
  const docs = await chunksCol()
    .find(mongoFilter(opts.filter), {
      projection: {
        text: 1,
        source: 1,
        docType: 1,
        page: 1,
        chunkIndex: 1,
        embedding: 1,
      },
    })
    .limit(FALLBACK_SCAN_CAP)
    .toArray();

  return rankByEmbedding({
    queryVector: opts.queryVector,
    docs: docs.filter((doc) => Array.isArray(doc.embedding)),
    limit: opts.limit,
  });
}

export async function searchKnowledgeChunks(opts: {
  query: string;
  embeddingModel: string;
  limit?: number;
  filter?: VectorSearchFilter;
}): Promise<KnowledgeHit[]> {
  const query = opts.query.trim();
  if (!query) return [];
  const limit = Math.min(10, Math.max(1, opts.limit ?? 5));

  const { embedding } = await embed({
    model: opts.embeddingModel,
    value: query,
  });

  const stages = vectorSearchStages({
    queryVector: embedding,
    limit,
    filter: opts.filter,
  });

  try {
    return (await chunksCol()
      .aggregate<KnowledgeHit>(stages)
      .toArray()) as KnowledgeHit[];
  } catch (error) {
    console.warn(
      "knowledge $vectorSearch unavailable, using in-memory cosine:",
      error,
    );
  }

  return fallbackSearch({
    queryVector: embedding,
    limit,
    filter: opts.filter,
  });
}
