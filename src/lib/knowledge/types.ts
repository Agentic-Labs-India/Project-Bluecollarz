export const KNOWLEDGE_DOC_TYPES = ["legal", "general"] as const;
export type KnowledgeDocType = (typeof KNOWLEDGE_DOC_TYPES)[number];

export const KNOWLEDGE_SOURCE_STATUSES = [
  "queued",
  "processing",
  "ready",
  "error",
] as const;
export type KnowledgeSourceStatus = (typeof KNOWLEDGE_SOURCE_STATUSES)[number];

/** Atlas Vector Search index name on KnowledgeChunks.embedding. */
export const KNOWLEDGE_VECTOR_INDEX = "knowledge_vector_index";
/** Must match the Atlas index and the default embedding model. */
export const KNOWLEDGE_EMBEDDING_DIMENSIONS = 1536;

/** ~800 tokens at ~4 chars/token. */
export const KNOWLEDGE_CHUNK_SIZE = 3200;
/** ~100 tokens of overlap so clauses are not cut at the boundary. */
export const KNOWLEDGE_CHUNK_OVERLAP = 400;

export type KnowledgeSourceListItem = {
  id: string;
  source: string;
  docType: KnowledgeDocType;
  status: KnowledgeSourceStatus;
  error: string | null;
  chunkCount: number;
  pageCount: number;
  blobUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeHit = {
  text: string;
  source: string;
  docType: KnowledgeDocType;
  page: number;
  chunkIndex: number;
  score: number;
};

export type KnowledgeCitation = {
  source: string;
  page: number;
};

export function normalizeKnowledgeSource(filename: string): string {
  const base = filename.replace(/\\/g, "/").split("/").pop() ?? filename;
  return base.trim().slice(0, 200);
}

export function knowledgeSourceKey(filename: string): string {
  return normalizeKnowledgeSource(filename).toLowerCase();
}
