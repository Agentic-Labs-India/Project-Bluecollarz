import {
  convertToModelMessages,
  isStepCount,
  isTextUIPart,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { after } from "next/server";
import { z } from "zod";
import {
  getAiRuntime,
  llmModel,
  llmTemp,
  renderHelpPrompt,
} from "@/lib/ai/runtime";
import { requireUser } from "@/lib/auth/session";
import { rateLimitPerMinute, tooManyRequests } from "@/lib/core/rate-limit";
import { lastUserText, screenWorkerTurnSafe } from "@/lib/legal-safety/detect";
import { prohibitedOutputGuard } from "@/lib/legal-safety/guard-stream";
import { createSupportTicket } from "@/lib/support/tickets";
import {
  SUPPORT_PRIORITIES,
  SUPPORT_PROBLEM_TYPES,
  SUPPORT_SERIOUSNESS,
  type SupportTranscriptTurn,
} from "@/lib/support/types";

export const maxDuration = 60;

/** Turns sent to the model (short context window). */
const HELP_MODEL_MESSAGE_LIMIT = 16;
/** Turns stored on a support ticket (can be longer than model context). */
const SUPPORT_TRANSCRIPT_TURN_LIMIT = 40;

function transcriptFromMessages(
  messages: UIMessage[],
): SupportTranscriptTurn[] {
  const turns: SupportTranscriptTurn[] = [];
  for (const message of messages) {
    if (message.role !== "user" && message.role !== "assistant") continue;
    const content = message.parts
      .filter(isTextUIPart)
      .map((p) => p.text)
      .join("\n")
      .trim();
    if (!content) continue;
    turns.push({ role: message.role, content });
  }
  return turns.slice(-SUPPORT_TRANSCRIPT_TURN_LIMIT);
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) {
    return new Response(auth.error, { status: auth.status });
  }
  const limit = await rateLimitPerMinute("helpChat", auth.user.id);
  if (!limit.ok) return tooManyRequests(limit);

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

  const recent = messages.slice(-HELP_MODEL_MESSAGE_LIMIT);
  const transcript = transcriptFromMessages(messages);

  after(async () => {
    await screenWorkerTurnSafe({
      userId: auth.user.id,
      profileType: auth.user.profileType,
      text: lastUserText(messages),
      sourceKind: "chat",
      sourceId: `help:${auth.user.id}`,
    });
  });

  const settings = await getAiRuntime();
  const result = streamText({
    model: llmModel(settings),
    instructions: renderHelpPrompt(
      settings,
      auth.user.profileType,
      languageCode,
    ),
    messages: await convertToModelMessages(recent),
    temperature: llmTemp(settings, "help"),
    experimental_transform: prohibitedOutputGuard({ surface: "help/chat" }),
    stopWhen: isStepCount(6),
    tools: {
      createSupportTicket: tool({
        description:
          "Create a support ticket after the user confirmed their problem and said they have nothing else to add (or after capturing extra notes). Call once per issue.",
        inputSchema: z.object({
          summary: z
            .string()
            .trim()
            .min(10)
            .max(2000)
            .describe("Clear summary of the user's problem"),
          problemType: z
            .enum(SUPPORT_PROBLEM_TYPES)
            .describe("Category of the issue"),
          seriousness: z
            .enum(SUPPORT_SERIOUSNESS)
            .describe("Impact severity for the user"),
          priority: z
            .enum(SUPPORT_PRIORITIES)
            .describe("How urgently ops should respond"),
          extraNotes: z
            .string()
            .trim()
            .max(2000)
            .optional()
            .describe("Optional extra details the user added"),
        }),
        execute: async (input) => {
          const summary = input.extraNotes?.trim()
            ? `${input.summary.trim()}\n\nAdditional notes: ${input.extraNotes.trim()}`
            : input.summary.trim();

          const ticket = await createSupportTicket({
            userId: auth.user.id,
            profileType: auth.user.profileType,
            transcript,
            summary,
            problemType: input.problemType,
            seriousness: input.seriousness,
            priority: input.priority,
          });

          return {
            ok: true as const,
            ticketId: ticket.id,
            status: ticket.status,
            message: `Support ticket ${ticket.id} created successfully.`,
          };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
