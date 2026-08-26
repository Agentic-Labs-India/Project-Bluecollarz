import "server-only";

import { embedMany } from "ai";
import { getPrivateBlob } from "@/lib/blob/server/get";
import { chunkPages } from "@/lib/knowledge/chunk";
import { extractPdfPages } from "@/lib/knowledge/extract";
import {
  claimKnowledgeIngest,
  markKnowledgeError,
  markKnowledgeReady,
  replaceKnowledgeChunks,
} from "@/lib/knowledge/store";
import { KNOWLEDGE_EMBEDDING_DIMENSIONS } from "@/lib/knowledge/types";
import { idHex } from "@/lib/utils";

const EMBED_BATCH = 64;

async function readBlobBytes(pathname: string): Promise<Uint8Array> {
  const result = await getPrivateBlob(pathname);
  if (!result?.stream) {
    throw new Error("Could not read the uploaded PDF");
  }
  const buffer = await new Response(result.stream).arrayBuffer();
  return new Uint8Array(buffer);
}

async function embedChunks(
  texts: string[],
  embeddingModel: string,
): Promise<number[][]> {
  const embeddings: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH) {
    const batch = texts.slice(i, i + EMBED_BATCH);
    const result = await embedMany({
      model: embeddingModel,
      values: batch,
    });
    embeddings.push(...result.embeddings);
  }
  return embeddings;
}

/** Extract → chunk → embed → replace. Safe to call again for the same file. */
export async function ingestKnowledgeSource(opts: {
  sourceId: string;
  embeddingModel: string;
}): Promise<void> {
  const claimed = await claimKnowledgeIngest(opts.sourceId);
  if (!claimed) return;

  const sourceId = idHex(claimed._id);
  try {
    const bytes = await readBlobBytes(claimed.blobPathname);
    const pages = await extractPdfPages(bytes);
    const pieces = await chunkPages(pages);
    if (!pieces.length) {
      throw new Error("No text chunks were produced from this PDF");
    }

    const embeddings = await embedChunks(
      pieces.map((piece) => piece.text),
      opts.embeddingModel,
    );
    if (embeddings.length !== pieces.length) {
      throw new Error("Embedding count did not match chunk count");
    }
    const dim = embeddings[0]?.length ?? 0;
    if (dim !== KNOWLEDGE_EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Embedding dimension ${dim} does not match the Atlas index (${KNOWLEDGE_EMBEDDING_DIMENSIONS}). Use openai/text-embedding-3-small or rebuild the index.`,
      );
    }

    await replaceKnowledgeChunks({
      sourceId,
      source: claimed.source,
      docType: claimed.docType,
      chunks: pieces.map((piece, index) => ({
        text: piece.text,
        embedding: embeddings[index],
        page: piece.page,
        chunkIndex: piece.chunkIndex,
      })),
    });
    await markKnowledgeReady({
      id: sourceId,
      chunkCount: pieces.length,
      pageCount: pages.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ingestion failed";
    console.error("ingestKnowledgeSource:", error);
    await markKnowledgeError(sourceId, message);
  }
}
