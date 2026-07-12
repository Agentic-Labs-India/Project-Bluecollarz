import { NextRequest, NextResponse } from "next/server";
import client, { DB_NAME, COLLECTIONS, isId, matchId } from "@/lib/db";
import type { InterviewDocument } from "@/lib/interviews";
import { analyzeInterviewTranscript } from "@/lib/interviews/analysis";
import { ensureIndexes } from "@/lib/db/indexes";
import { requireProfile } from "@/lib/api/session";
import { idHex } from "@/lib/utils";

export const maxDuration = 90;

type RouteContext = { params: Promise<{ id: string }> };

/** Finalize interview: run communication analysis and mark stage completed. */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    await ensureIndexes();
    const auth = await requireProfile("work");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    if (!auth.user.id) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    const { id } = await context.params;
    if (!isId(id)) {
      return NextResponse.json({ error: "Invalid interview id" }, { status: 400 });
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
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }
    if (interview.status === "completed") {
      return NextResponse.json({
        ok: true,
        alreadyComplete: true,
        interviewId: id,
        stageId: interview.stageId,
        analysis: interview.analysis,
        videoUrl: interview.videoUrl,
      });
    }

    // Merge any client-side transcript turns that weren't persisted mid-stream.
    let transcript = interview.transcript ?? [];
    if (Array.isArray(body.transcript) && body.transcript.length) {
      const extras = body.transcript
        .filter((t) => t?.text?.trim())
        .map((t) => ({
          role: t.role,
          text: t.text.trim().slice(0, 4000),
          at: new Date(),
        }));
      if (extras.length) {
        transcript = [...transcript, ...extras];
      }
    }

    const videoUrl = body.videoUrl?.trim() || interview.videoUrl;
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

    const analysis = await analyzeInterviewTranscript({
      stageId: interview.stageId,
      jobTitle: interview.jobTitle,
      jobOverview: interview.jobOverview,
      transcript,
    });

    const now = new Date();

    await db.collection(COLLECTIONS.INTERVIEWS).updateOne(
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
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
