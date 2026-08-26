import "server-only";

import { tool } from "ai";
import { z } from "zod";
import { searchKnowledgeChunks } from "@/lib/knowledge/search";
import { listReadyKnowledgeCatalog } from "@/lib/knowledge/store";
import {
  KNOWLEDGE_DOC_TYPES,
  type KnowledgeDocType,
} from "@/lib/knowledge/types";

export function knowledgeRagTools(opts: {
  embeddingModel: string;
  docTypeFilter?: KnowledgeDocType;
}) {
  return {
    listDocuments: tool({
      description:
        "List uploaded PDFs that have finished ingesting (filename, type tag, pages, chunk count). Call this when the user asks what documents exist.",
      inputSchema: z.object({}),
      execute: async () => {
        const documents = await listReadyKnowledgeCatalog();
        return {
          documents,
          empty: documents.length === 0,
        };
      },
    }),
    searchDocuments: tool({
      description:
        "Retrieve PDF chunks from the knowledge base. Put the topic in query. Do not set docType unless the user asked to restrict to that upload tag.",
      inputSchema: z.object({
        query: z
          .string()
          .trim()
          .min(2)
          .max(500)
          .describe("Search query to embed and retrieve against"),
        docType: z
          .enum(KNOWLEDGE_DOC_TYPES)
          .optional()
          .describe(
            "Only the admin upload tag. Do not set this because the question is about that topic.",
          ),
        source: z
          .string()
          .trim()
          .min(1)
          .max(200)
          .optional()
          .describe("Restrict to one filename, e.g. contract_2024.pdf"),
        k: z
          .number()
          .int()
          .min(1)
          .max(10)
          .optional()
          .describe("How many chunks to retrieve (default 5)"),
      }),
      execute: async (input) => {
        try {
          const hits = await searchKnowledgeChunks({
            query: input.query,
            embeddingModel: opts.embeddingModel,
            limit: input.k,
            filter: {
              docType: input.docType ?? opts.docTypeFilter,
              source: input.source,
            },
          });
          return {
            hits: hits.map((hit) => ({
              text: hit.text,
              source: hit.source,
              page: hit.page,
              docType: hit.docType,
              score: hit.score,
            })),
            insufficient: hits.length === 0,
          };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Search failed";
          console.error("searchDocuments:", error);
          return {
            hits: [] as const,
            insufficient: true,
            error: message,
          };
        }
      },
    }),
  };
}
