import { after, type NextRequest, NextResponse } from "next/server";
import { requireInterviewEvaluationConsent } from "@/lib/auth/candidate-guard";
import { isInterviewRecordingUrl } from "@/lib/blob/pathname";
import client, { COLLECTIONS, DB_NAME, isId, matchId } from "@/lib/db";
import { ensureIndexes } from "@/lib/db/indexes";
import type { InterviewDocument } from "@/lib/interviews";
import { isCustomQuestionsStage } from "@/lib/interviews";
import { analyzeInterviewTranscript } from "@/lib/interviews/analysis";
import { screenWorkerTurnSafe } from "@/lib/legal-safety/detect";
import { idHex } from "@/lib/utils";

export const maxDuration = 90;

type RouteContext = { params: Promise<{ id: string }> };

/** Finalize interview: run communication analysis and mark stage completed. */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    await ensureIndexes();
    const auth = await requireInterviewEvaluationConsent();
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error, code: auth.code },
        { status: auth.status },
      );
    }
    if (!auth.user.id) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    const { id } = await context.params;
    if (!isId(id)) {
      return NextResponse.json(
        { error: "Invalid interview id" },
        { status: 400 },
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      videoUrl?: string;
      transcript?: Array<{ role: "assistant" | "user"; text: string }>;
    };

    const db = client.db(DB_NAME);
    const interview = await db
      .collection<InterviewDocument>(COLLECTIONS.INTERVIEWS)
      .findOne({
        _id: matchId(id) as never,
        applicantId: auth.user.id,
      } as never);

    if (!interview) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 },
      );
    }
    if (isCustomQuestionsStage(interview.stageId)) {
      return NextResponse.json(
        {
          error:
            "Custom questions are completed via the form submit endpoint, not video complete.",
        },
        { status: 400 },
      );
    }

    const incomingVideoUrl = body.videoUrl?.trim();
    const videoUrl = incomingVideoUrl || interview.videoUrl;
    if (!videoUrl) {
      return NextResponse.json(
        {
          error:
            "Interview recording is required before this stage can be completed.",
          code: "VIDEO_REQUIRED",
        },
        { status: 400 },
      );
    }
    if (!isInterviewRecordingUrl(videoUrl, id)) {
      return NextResponse.json(
        {
          error: "Interview recording URL is invalid for this interview.",
          code: "VIDEO_INVALID",
        },
        { status: 400 },
      );
    }

    const now = new Date();
    const interviews = db.collection(COLLECTIONS.INTERVIEWS);

    // Persist the blob URL before scoring. Analysis can hit maxDuration and
    // abort the request; the recording must still land on the interview doc.
    if (videoUrl !== interview.videoUrl) {
      await interviews.updateOne(
        { _id: matchId(id) as never },
        { $set: { videoUrl, updatedAt: now } },
      );
    }

    if (interview.status === "completed") {
      return NextResponse.json({
        ok: true,
        alreadyComplete: true,
        interviewId: id,
        stageId: interview.stageId,
        analysis: interview.analysis,
        videoUrl,
      });
    }

    // Client transcript has both roles; DB only stores user turns mid-chat.
    // Prefer client when present to avoid duplicating user answers in scoring.
    let transcript = interview.transcript ?? [];
    if (Array.isArray(body.transcript) && body.transcript.length) {
      transcript = body.transcript
        .filter((t) => t?.text?.trim())
        .map((t) => ({
          role: t.role,
          text: t.text.trim().slice(0, 4000),
          at: new Date(),
        }));
    }

    const analysis = await analyzeInterviewTranscript({
      stageId: interview.stageId,
      jobTitle: interview.jobTitle,
      jobOverview: interview.jobOverview,
      transcript,
    });

    await interviews.updateOne(
      { _id: matchId(id) as never },
      {
        $set: {
          status: "completed",
          transcript,
          analysis,
          videoUrl,
          completedAt: now,
          updatedAt: now,
        },
      },
    );

    const userAnswers = transcript
      .filter((turn) => turn.role === "user")
      .map((turn) => turn.text)
      .join("\n");
    after(async () => {
      await screenWorkerTurnSafe({
        userId: auth.user.id,
        profileType: "work",
        text: userAnswers,
        sourceKind: "interview",
        sourceId: id,
      });
    });

    return NextResponse.json({
      ok: true,
      interviewId: idHex(interview._id) || id,
      stageId: interview.stageId,
      jobId: interview.jobId,
      analysis,
      videoUrl,
    });
  } catch (error) {
    console.error("POST /api/interviews/[id]/complete:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
