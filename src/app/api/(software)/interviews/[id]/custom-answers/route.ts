import { NextRequest, NextResponse } from "next/server";
import client, { DB_NAME, COLLECTIONS, isId, matchId } from "@/lib/db";
import {
  normalizeCustomQuestions,
  validateCustomAnswer,
  type CustomQuestionAnswer,
} from "@/lib/jobs/custom-questions";
import {
  isCustomQuestionsStage,
  type InterviewDocument,
} from "@/lib/interviews";
import { ensureIndexes } from "@/lib/db/indexes";
import { requireProfile } from "@/lib/api/session";

type RouteContext = { params: Promise<{ id: string }> };

/** Submit custom-question answers and mark the stage completed. */
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
      return NextResponse.json(
        { error: "Invalid interview id" },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => null);
    const rawAnswers = (body as { answers?: unknown } | null)?.answers;
    if (!Array.isArray(rawAnswers)) {
      return NextResponse.json(
        { error: "Expected { answers: [...] }" },
        { status: 400 },
      );
    }

    const db = client.db(DB_NAME);
    const interviews = db.collection<InterviewDocument>(COLLECTIONS.INTERVIEWS);
    const interview = await interviews.findOne({
      _id: matchId(id) as never,
      applicantId: auth.user.id,
    } as never);

    if (!interview) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 },
      );
    }
    if (!isCustomQuestionsStage(interview.stageId)) {
      return NextResponse.json(
        { error: "This interview is not a custom questions stage." },
        { status: 400 },
      );
    }
    if (interview.status === "completed") {
      return NextResponse.json({
        ok: true,
        alreadyComplete: true,
        interviewId: id,
      });
    }

    // Prefer frozen snapshot on the interview; never re-read live job config.
    const questions = normalizeCustomQuestions(interview.customQuestions);
    if (!questions.length) {
      return NextResponse.json(
        {
          error:
            "This interview has no question snapshot. Restart the custom questions stage.",
        },
        { status: 400 },
      );
    }

    const byId = new Map(
      rawAnswers.map((a) => {
        const row = a as { questionId?: unknown; value?: unknown };
        return [String(row.questionId ?? ""), row.value] as const;
      }),
    );

    const validated: CustomQuestionAnswer[] = [];
    const errors: Record<string, string> = {};
    for (const q of questions) {
      const result = validateCustomAnswer(q, byId.get(q.id));
      if (!result.ok) {
        errors[q.id] = result.error;
      } else {
        validated.push({ questionId: q.id, value: result.value });
      }
    }

    if (Object.keys(errors).length) {
      return NextResponse.json(
        { error: "Some answers are invalid", errors },
        { status: 400 },
      );
    }

    const now = new Date();
    await interviews.updateOne(
      { _id: matchId(id) as never, applicantId: auth.user.id } as never,
      {
        $set: {
          customAnswers: validated,
          status: "completed",
          completedAt: now,
          updatedAt: now,
        },
      } as never,
    );

    return NextResponse.json({
      ok: true,
      interviewId: id,
      status: "completed",
    });
  } catch (error) {
    console.error("POST /api/interviews/[id]/custom-answers:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
