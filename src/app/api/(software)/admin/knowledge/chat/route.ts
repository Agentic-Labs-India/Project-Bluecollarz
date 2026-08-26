import {
  convertToModelMessages,
  isStepCount,
  streamText,
  type UIMessage,
} from "ai";
import {
  embeddingModel,
  getAiRuntime,
  llmModel,
  llmTemp,
  renderKnowledgePrompt,
} from "@/lib/ai/runtime";
import { requireProfile } from "@/lib/auth/session";
import { rateLimitPerMinute, tooManyRequests } from "@/lib/core/rate-limit";
import { knowledgeRagTools } from "@/lib/knowledge/tools";
import { isKnowledgeDocType } from "@/lib/knowledge/types";
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
    language_code?: unknown;
  };
  if (!Array.isArray(payload.messages)) {
    return new Response("Expected { messages: unknown[] }", { status: 400 });
  }

  const docTypeFilter = isKnowledgeDocType(payload.docType)
    ? payload.docType
    : undefined;
  const languageCode =
    typeof payload.language_code === "string" ? payload.language_code : null;

  const recent = payload.messages.slice(-KNOWLEDGE_MODEL_MESSAGE_LIMIT);
  const settings = await getAiRuntime();

  const result = streamText({
    model: llmModel(settings),
    instructions: renderKnowledgePrompt(settings, languageCode),
    messages: await convertToModelMessages(recent),
    temperature: llmTemp(settings, "knowledge"),
    experimental_transform: prohibitedOutputGuard({
      surface: "admin/knowledge",
    }),
    stopWhen: isStepCount(5),
    tools: knowledgeRagTools({
      embeddingModel: embeddingModel(settings),
      docTypeFilter,
    }),
  });

  return result.toUIMessageStreamResponse();
}
