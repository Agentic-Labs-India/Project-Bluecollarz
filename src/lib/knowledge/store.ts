import "server-only";

import { ObjectId, type WithId } from "mongodb";
import { deleteBlobUrls } from "@/lib/blob/server/delete";
import {
  blobPathRelativeToRoot,
  isKnowledgePdfRelativePath,
} from "@/lib/blob/pathname";
import client, { COLLECTIONS, DB_NAME, isId, matchId } from "@/lib/db";
import { ensureIndexes } from "@/lib/db/indexes";
import {
  type KnowledgeDocType,
  type KnowledgeSourceListItem,
  type KnowledgeSourceStatus,
  knowledgeSourceKey,
  normalizeKnowledgeSource,
} from "@/lib/knowledge/types";
import { idHex } from "@/lib/utils";

export type KnowledgeSourceDocument = {
  source: string;
  sourceKey: string;
  docType: KnowledgeDocType;
  blobUrl: string;
  blobPathname: string;
  status: KnowledgeSourceStatus;
  error: string | null;
  chunkCount: number;
  pageCount: number;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type KnowledgeChunkDocument = {
  text: string;
  embedding: number[];
  source: string;
  sourceId: string;
  docType: KnowledgeDocType;
  page: number;
  chunkIndex: number;
  createdAt: Date;
};

function sourcesCol() {
  return client
    .db(DB_NAME)
    .collection<KnowledgeSourceDocument>(COLLECTIONS.KNOWLEDGE_SOURCES);
}

function chunksCol() {
  return client
    .db(DB_NAME)
    .collection<KnowledgeChunkDocument>(COLLECTIONS.KNOWLEDGE_CHUNKS);
}

function toListItem(
  doc: WithId<KnowledgeSourceDocument>,
): KnowledgeSourceListItem {
  return {
    id: idHex(doc._id),
    source: doc.source,
    docType: doc.docType,
    status: doc.status,
    error: doc.error,
    chunkCount: doc.chunkCount,
    pageCount: doc.pageCount,
    blobUrl: doc.blobUrl,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function listKnowledgeSources(): Promise<
  KnowledgeSourceListItem[]
> {
  await ensureIndexes();
  const docs = await sourcesCol()
    .find({})
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray();
  return docs.map(toListItem);
}

export async function listReadyKnowledgeCatalog(): Promise<
  Array<{
    source: string;
    docType: KnowledgeDocType;
    chunkCount: number;
    pageCount: number;
  }>
> {
  await ensureIndexes();
  const docs = await sourcesCol()
    .find({ status: "ready", chunkCount: { $gt: 0 } })
    .project({ source: 1, docType: 1, chunkCount: 1, pageCount: 1 })
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray();
  return docs.map((doc) => ({
    source: doc.source,
    docType: doc.docType,
    chunkCount: doc.chunkCount,
    pageCount: doc.pageCount,
  }));
}

export async function getKnowledgeSource(id: string) {
  if (!isId(id)) return null;
  return sourcesCol().findOne({ _id: matchId(id) as never });
}

export async function enqueueKnowledgeSource(input: {
  filename: string;
  docType: KnowledgeDocType;
  blobUrl: string;
  blobPathname: string;
  uploadedBy: string;
}): Promise<KnowledgeSourceListItem> {
  await ensureIndexes();
  const source = normalizeKnowledgeSource(input.filename);
  if (!source.toLowerCase().endsWith(".pdf")) {
    throw new Error("Only PDF files can be added to the knowledge base");
  }
  const relative = blobPathRelativeToRoot(input.blobPathname);
  if (!relative || !isKnowledgePdfRelativePath(relative)) {
    throw new Error("Upload must be under admin/knowledge/");
  }

  const now = new Date();
  const sourceKey = knowledgeSourceKey(source);
  const existing = await sourcesCol().findOne({ sourceKey });
  if (existing && existing.blobUrl !== input.blobUrl) {
    await deleteBlobUrls([existing.blobUrl]);
  }

  const result = await sourcesCol().findOneAndUpdate(
    { sourceKey },
    {
      $set: {
        source,
        sourceKey,
        docType: input.docType,
        blobUrl: input.blobUrl,
        blobPathname: input.blobPathname,
        status: "queued",
        error: null,
        uploadedBy: input.uploadedBy,
        updatedAt: now,
      },
      $setOnInsert: {
        chunkCount: 0,
        pageCount: 0,
        createdAt: now,
      },
    },
    { upsert: true, returnDocument: "after" },
  );

  if (!result) {
    throw new Error("Could not queue the document");
  }
  return toListItem(result);
}

export async function requeueKnowledgeSource(id: string): Promise<boolean> {
  if (!isId(id)) return false;
  const result = await sourcesCol().updateOne(
    {
      _id: new ObjectId(id),
      status: { $in: ["queued", "ready", "error"] },
    },
    {
      $set: {
        status: "queued",
        error: null,
        updatedAt: new Date(),
      },
    },
  );
  return result.modifiedCount > 0 || result.matchedCount > 0;
}

export async function claimKnowledgeIngest(id: string) {
  if (!isId(id)) return null;
  return sourcesCol().findOneAndUpdate(
    {
      _id: new ObjectId(id),
      status: { $in: ["queued", "error"] },
    },
    {
      $set: {
        status: "processing",
        error: null,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" },
  );
}

export async function markKnowledgeReady(input: {
  id: string;
  chunkCount: number;
  pageCount: number;
}) {
  if (!isId(input.id)) return;
  await sourcesCol().updateOne(
    { _id: new ObjectId(input.id) },
    {
      $set: {
        status: "ready",
        error: null,
        chunkCount: input.chunkCount,
        pageCount: input.pageCount,
        updatedAt: new Date(),
      },
    },
  );
}

export async function markKnowledgeError(id: string, error: string) {
  if (!isId(id)) return;
  await sourcesCol().updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        status: "error",
        error: error.slice(0, 500),
        updatedAt: new Date(),
      },
    },
  );
}

export async function replaceKnowledgeChunks(input: {
  sourceId: string;
  source: string;
  docType: KnowledgeDocType;
  chunks: Array<{
    text: string;
    embedding: number[];
    page: number;
    chunkIndex: number;
  }>;
}) {
  const now = new Date();
  await chunksCol().deleteMany({ sourceId: input.sourceId });
  if (!input.chunks.length) return;
  await chunksCol().insertMany(
    input.chunks.map((chunk) => ({
      text: chunk.text,
      embedding: chunk.embedding,
      source: input.source,
      sourceId: input.sourceId,
      docType: input.docType,
      page: chunk.page,
      chunkIndex: chunk.chunkIndex,
      createdAt: now,
    })),
  );
}

export async function deleteKnowledgeSource(id: string): Promise<boolean> {
  await ensureIndexes();
  if (!isId(id)) return false;
  const doc = await sourcesCol().findOne({ _id: matchId(id) as never });
  if (!doc) return false;
  await chunksCol().deleteMany({ sourceId: idHex(doc._id) });
  await sourcesCol().deleteOne({ _id: doc._id });
  await deleteBlobUrls([doc.blobUrl]);
  return true;
}
