import { createAgentUIStreamResponse } from "ai";
import { NextRequest } from "next/server";
import client, { DB_NAME, COLLECTIONS, isId, matchId } from "@/lib/db";
import type { InterviewDocument } from "@/lib/interviews";
import { buildInterviewAgent } from "@/lib/interviews/agent";
import { isInterviewKickoffText } from "@/lib/interviews/labels";
import { ensureIndexes } from "@/lib/db/indexes";
import { requireProfile } from "@/lib/api/session";
import { idHex } from "@/lib/utils";

export const maxDuration = 90;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  await ensureIndexes();
  const auth = await requireProfile("work");
  if (!auth.ok) {
    return new Response(auth.error, { status: auth.status });
  }
  if (!auth.user.id) {
    return new Response("Invalid user", { status: 400 });
  }

  const { id } = await context.params;
  if (!isId(id)) {
    return new Response("Invalid interview id", { status: 400 });
  }

  const db = client.db(DB_NAME);
  const interview = await db
    .collection<InterviewDocument>(COLLECTIONS.INTERVIEWS)
    .findOne({
      _id: matchId(id) as never,
      applicantId: auth.user.id,
    } as never);

  if (!interview) {
    return new Response("Interview not found", { status: 404 });
  }
  if (interview.status === "completed") {
    return new Response("Interview already completed", { status: 409 });
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

  const lastUser = [...messages].reverse().find(
    (m) =>
      m &&
      typeof m === "object" &&
      (m as { role?: string }).role === "user",
  ) as { parts?: Array<{ type?: string; text?: string }> } | undefined;
  const userText =
    lastUser?.parts
      ?.filter((p) => p?.type === "text" && typeof p.text === "string")
      .map((p) => p.text!.trim())
      .filter(Boolean)
      .join(" ")
      .trim() || "";

  if (userText && !isInterviewKickoffText(userText)) {
    await db.collection(COLLECTIONS.INTERVIEWS).updateOne(
      { _id: matchId(id) as never },
      {
        $push: {
          transcript: {
            role: "user" as const,
            text: userText.slice(0, 4000),
            at: new Date(),
          },
        },
        $set: { updatedAt: new Date() },
      } as never,
    );
  }

  const agent = buildInterviewAgent({
    interviewId: idHex(interview._id) || id,
    stageId: interview.stageId,
    jobTitle: interview.jobTitle,
    jobOverview: interview.jobOverview,
  });

  return createAgentUIStreamResponse({
    agent,
    uiMessages: messages,
  });
}
