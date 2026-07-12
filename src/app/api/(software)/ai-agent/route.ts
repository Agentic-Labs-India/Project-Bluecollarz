import {
  createAgentUIStreamResponse,
  type InferAgentUIMessage,
  stepCountIs,
  ToolLoopAgent,
  tool,
} from "ai";
import { headers } from "next/headers";
import { z } from "zod";
import { websearchTool } from "@/lib/ai-tools/websearch/websearch-tool";
import { auth } from "@/lib/auth/auth";

export const maxDuration = 60;

/** Streams UI messages via createAgentUIStreamResponse (AI SDK agents). */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as { profileType?: string } | undefined;
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (user?.profileType && user.profileType !== "hire") {
    return new Response("Hiring partner profile required", { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const messages = (body as { messages?: unknown }).messages;
  if (!Array.isArray(messages)) {
    return new Response("Expected { messages: unknown[] }", { status: 400 });
  }

  return createAgentUIStreamResponse({
    agent: docAssistantAgent,
    uiMessages: messages,
  });
}

const gatewayModel = process.env.AI_GATEWAY_MODEL?.trim() || "openai/gpt-4o";

export const docAssistantAgent = new ToolLoopAgent({
  id: "gulf-path-assistant",
  model: gatewayModel,
  instructions:
    'You are a helpful hiring assistant for Gulf Path, a platform that connects expert candidates with hiring teams. Help hiring partners draft roles, refine job requirements, screen approaches, and plan interviews. Answer clearly in Markdown when formatting helps. Users may attach images and PDFs: read and reason from their visible text or image content, quote or summarize only what is present, and say if something is unreadable. When the user\'s message begins with "Utilize @searchWebTool" or they need fresh facts from the web, call the webSearch tool with a tight search query, then answer using the returned titles/snippets/URLs (mention sources). If webSearch returns few results, say so. When it begins with "Utilize @deepResearchTool", still use webSearch if external sources help, then give a deeper structured answer with tradeoffs and follow-ups. Prefer getCurrentTime for "what time is it" and summarizeTopic for generic hiring workflow overviews. Never invent personal candidate or employer data that was not provided.',
  stopWhen: stepCountIs(20),
  tools: {
    webSearch: websearchTool,
    getCurrentTime: tool({
      description: "Return the current server time and local timezone.",
      inputSchema: z.object({}),
      execute: async () => ({
        iso: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    }),
    summarizeTopic: tool({
      description:
        "Return a short neutral overview of a hiring, applications, or career workflow topic.",
      inputSchema: z.object({
        topic: z.string().describe("Topic in plain language"),
      }),
      execute: async ({ topic }) => ({
        overview: `High-level notes on “${topic}”: clarify requirements, gather evidence, and confirm details with the candidate or hiring team rather than assuming.`,
      }),
    }),
  },
});

export type DocAssistantUIMessage = InferAgentUIMessage<
  typeof docAssistantAgent
>;
