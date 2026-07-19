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

  const messages = (body as { messages?: UIMessage[] }).messages;
  if (!Array.isArray(messages)) {
    return new Response("Expected { messages: unknown[] }", { status: 400 });
  }

  // Keep help chats short — only last turns to the model.
  const recent = messages.slice(-16);

  const result = streamText({
    model: gatewayModel,
    system: buildHelpSystemPrompt(auth.user.profileType),
    messages: await convertToModelMessages(recent),
    temperature: 0.4,
  });

  return result.toUIMessageStreamResponse();
}
