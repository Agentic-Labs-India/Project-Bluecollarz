import { createAgentUIStreamResponse } from "ai";
import type { NextRequest } from "next/server";
import { requireInterviewEvaluationConsent } from "@/lib/auth/candidate-guard";
import { rateLimitPerMinute, tooManyRequests } from "@/lib/core/rate-limit";
import client, { COLLECTIONS, DB_NAME, isId, matchId } from "@/lib/db";
import { ensureIndexes } from "@/lib/db/indexes";
import type { InterviewDocument } from "@/lib/interviews";
import { isAiInterviewStage, isCustomQuestionsStage } from "@/lib/interviews";
import { buildInterviewAgent } from "@/lib/interviews/agent";
import { isInterviewKickoffText } from "@/lib/interviews/labels";
import { prohibitedOutputGuard } from "@/lib/legal-safety/guard-stream";
import { screenWorkerTurnSafe } from "@/lib/legal-safety/detect";
import { idHex } from "@/lib/utils";

export const maxDuration = 90;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  await ensureIndexes();
  const auth = await requireInterviewEvaluationConsent();
  if (!auth.ok) {
    return new Response(auth.error, { status: auth.status });
  }
  const limit = rateLimitPerMinute("interviewChat", auth.user.id);
  if (!limit.ok) return tooManyRequests(limit);
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
  if (isCustomQuestionsStage(interview.stageId)) {
    return new Response("Custom questions stage does not use chat", {
      status: 400,
    });
  }
  if (!isAiInterviewStage(interview.stageId)) {
    return new Response("Unsupported interview stage", { status: 400 });
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

  const messages = (body as { messages?: unknown; language_code?: unknown })
    .messages;
  if (!Array.isArray(messages)) {
    return new Response("Expected { messages: unknown[] }", { status: 400 });
  }

  const bodyLanguageCode =
    typeof (body as { language_code?: unknown }).language_code === "string"
      ? (body as { language_code: string }).language_code.trim()
      : "";

  // Prefer client override; otherwise load from the candidate profile.
  let languageCode: string | null = bodyLanguageCode || null;
  if (!languageCode) {
    const userDoc = await db
      .collection<{ voiceLanguage?: string }>(COLLECTIONS.USERS_COLLECTION)
      .findOne({ _id: matchId(auth.user.id) as never }, {
        projection: { voiceLanguage: 1 },
      } as never);
    languageCode = userDoc?.voiceLanguage?.trim() || "en-IN";
  }

  const lastUser = [...messages]
    .reverse()
    .find(
      (m) =>
        m && typeof m === "object" && (m as { role?: string }).role === "user",
    ) as { parts?: Array<{ type?: string; text?: string }> } | undefined;
  const userText =
    lastUser?.parts
      ?.flatMap((p) =>
        p?.type === "text" && typeof p.text === "string" ? [p.text.trim()] : [],
      )
      .filter(Boolean)
      .join(" ")
      .trim() || "";

  if (userText && !isInterviewKickoffText(userText)) {
    await db
      .collection(COLLECTIONS.INTERVIEWS)
      .updateOne({ _id: matchId(id) as never }, {
        $push: {
          transcript: {
            role: "user" as const,
            text: userText.slice(0, 4000),
            at: new Date(),
          },
        },
        $set: { updatedAt: new Date() },
      } as never);
    await screenWorkerTurnSafe({
      userId: auth.user.id,
      profileType: "work",
      text: userText,
      sourceKind: "interview",
      sourceId: id,
    });
  }

  const agent = await buildInterviewAgent({
    interviewId: idHex(interview._id) || id,
    stageId: interview.stageId,
    jobTitle: interview.jobTitle,
    jobOverview: interview.jobOverview,
    languageCode,
  });

  return createAgentUIStreamResponse({
    agent,
    uiMessages: messages,
    experimental_transform: prohibitedOutputGuard({
      surface: "interviews/chat",
    }),
  });
}
