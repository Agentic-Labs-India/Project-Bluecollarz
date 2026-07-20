import {
  convertToModelMessages,
  streamText,
  type UIMessage,
} from "ai";
import { requireUser } from "@/lib/api/session";
import { buildHelpSystemPrompt } from "@/lib/help/prompt";

export const maxDuration = 60;

const gatewayModel = process.env.AI_GATEWAY_MODEL?.trim() || "openai/gpt-4o";

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) {
    return new Response(auth.error, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const messages = (body as { messages?: UIMessage[]; language_code?: unknown })
    .messages;
  if (!Array.isArray(messages)) {
    return new Response("Expected { messages: unknown[] }", { status: 400 });
  }

  const languageCode =
    typeof (body as { language_code?: unknown }).language_code === "string"
      ? (body as { language_code: string }).language_code
      : null;

  // Keep help chats short — only last turns to the model.
  const recent = messages.slice(-16);

  const result = streamText({
    model: gatewayModel,
    instructions: buildHelpSystemPrompt(auth.user.profileType, languageCode),
    messages: await convertToModelMessages(recent),
    temperature: 0.4,
  });

  return result.toUIMessageStreamResponse();
}
