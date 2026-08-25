import {
  convertToModelMessages,
  isStepCount,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import {
  embeddingModel,
  getAiRuntime,
  llmModel,
  llmTemp,
  renderKnowledgePrompt,
} from "@/lib/ai/runtime";
import { requireProfile } from "@/lib/auth/session";
import { rateLimitPerMinute, tooManyRequests } from "@/lib/core/rate-limit";
import { searchKnowledgeChunks } from "@/lib/knowledge/search";
import { listReadyKnowledgeCatalog } from "@/lib/knowledge/store";
import { KNOWLEDGE_DOC_TYPES } from "@/lib/knowledge/types";
import { prohibitedOutputGuard } from "@/lib/legal-safety/guard-stream";

export const maxDuration = 60;

const KNOWLEDGE_MODEL_MESSAGE_LIMIT = 16;

export async function POST(request: Request) {
  const auth = await requireProfile("admin");
  if (!auth.ok) {
    return new Response(auth.error, { status: auth.status });
  }
  const limit = await rateLimitPerMinute("knowledgeChat", auth.user.id);
  if (!limit.ok) return tooManyRequests(limit);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const payload = body as {
    messages?: UIMessage[];
    docType?: unknown;
  };
  if (!Array.isArray(payload.messages)) {
    return new Response("Expected { messages: unknown[] }", { status: 400 });
  }

  const docTypeFilter =
    payload.docType === "legal" || payload.docType === "general"
      ? payload.docType
      : undefined;

  const recent = payload.messages.slice(-KNOWLEDGE_MODEL_MESSAGE_LIMIT);
  const settings = await getAiRuntime();
  const embedModel = embeddingModel(settings);

  const result = streamText({
    model: llmModel(settings),
    instructions: renderKnowledgePrompt(settings),
    messages: await convertToModelMessages(recent),
    temperature: llmTemp(settings, "knowledge"),
    experimental_transform: prohibitedOutputGuard({
      surface: "admin/knowledge",
    }),
    stopWhen: isStepCount(5),
    tools: {
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
          "Retrieve PDF chunks from the knowledge base. Call before answering content questions. Put the topic in query. Do not set docType unless the user asked to restrict to that upload tag.",
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
              "Only the admin upload tag (legal | general). Do not set this because the question is about law.",
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
              embeddingModel: embedModel,
              limit: input.k,
              filter: {
                docType: input.docType ?? docTypeFilter,
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
    },
  });

  return result.toUIMessageStreamResponse();
}
