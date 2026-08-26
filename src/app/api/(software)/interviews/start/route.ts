import { ObjectId } from "mongodb";
import { type NextRequest, NextResponse } from "next/server";
import { parseTtsLanguage } from "@/lib/ai/voice/languages";
import { requireInterviewEvaluationConsent } from "@/lib/auth/candidate-guard";
import client, { COLLECTIONS, DB_NAME, isId, matchId } from "@/lib/db";
import { ensureIndexes } from "@/lib/db/indexes";
import {
  formatInterviewError,
  type InterviewDocument,
  type InterviewStageId,
  interviewStartSchema,
  isAiInterviewStage,
  isCustomQuestionsStage,
} from "@/lib/interviews";
import type { JobDocument } from "@/lib/jobs";
import { normalizeCustomQuestions, normalizeStepTemplates } from "@/lib/jobs";
import type { CustomQuestion } from "@/lib/jobs/custom-questions";
import { idHex } from "@/lib/utils";

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}

function questionsPayload(
  stageId: InterviewStageId,
  questions: CustomQuestion[] | undefined,
) {
  return isCustomQuestionsStage(stageId) ? (questions ?? []) : undefined;
}

/** Start (or resume) an interview stage for a published role. */
export async function POST(req: NextRequest) {
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

    const body = await req.json().catch(() => null);
    const parsed = interviewStartSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatInterviewError(parsed.error) },
        { status: 400 },
      );
    }

    const { jobId, stageId } = parsed.data;
    if (!isId(jobId)) {
      return NextResponse.json({ error: "Invalid job id" }, { status: 400 });
    }

    const db = client.db(DB_NAME);

    const [job, userDoc] = await Promise.all([
      db
        .collection<JobDocument>(COLLECTIONS.JOBS)
        .findOne({ _id: matchId(jobId) as never, status: "published" }),
      db
        .collection<{ voiceLanguage?: string }>(COLLECTIONS.USERS_COLLECTION)
        .findOne(
          { _id: matchId(auth.user.id) as never },
          { projection: { voiceLanguage: 1 } },
        ),
    ]);
    if (!job) {
      return NextResponse.json(
        { error: "This role is no longer accepting interviews." },
        { status: 404 },
      );
    }
    const voiceLanguage = parseTtsLanguage(userDoc?.voiceLanguage) || "en-IN";

    const stages = normalizeStepTemplates(job.applicationStepTemplates);
    if (!stages.some((s) => s.id === stageId)) {
      return NextResponse.json(
        { error: "This interview stage is not enabled for the role." },
        { status: 400 },
      );
    }

    const jobQuestions = isCustomQuestionsStage(stageId)
      ? normalizeCustomQuestions(job.customQuestions)
      : [];
    if (isCustomQuestionsStage(stageId) && jobQuestions.length === 0) {
      return NextResponse.json(
        { error: "This role has no custom questions configured." },
        { status: 400 },
      );
    }

    const interviews = db.collection<InterviewDocument>(COLLECTIONS.INTERVIEWS);

    const existing = await interviews.findOne({
      applicantId: auth.user.id,
      jobId,
      stageId,
      status: { $in: ["completed", "in_progress"] },
    } as never);

    if (existing?.status === "completed") {
      const missingRecording =
        isAiInterviewStage(stageId) && !existing.videoUrl;
      if (!missingRecording) {
        return NextResponse.json({
          interviewId: idHex(existing._id),
          status: "completed",
          alreadyComplete: true,
          customQuestions: questionsPayload(
            stageId,
            existing.customQuestions?.length
              ? existing.customQuestions
              : jobQuestions,
          ),
        });
      }
      await interviews.updateOne({ _id: existing._id } as never, {
        $set: { status: "in_progress", updatedAt: new Date() },
      });
      existing.status = "in_progress";
    }

    if (existing?.status === "in_progress") {
      const snapshot = existing.customQuestions?.length
        ? existing.customQuestions
        : jobQuestions;
      const needsQuestions =
        isCustomQuestionsStage(stageId) &&
        !existing.customQuestions?.length &&
        snapshot.length > 0;
      const needsLanguage = !parseTtsLanguage(existing.voiceLanguage);
      if (needsQuestions || needsLanguage) {
        await interviews.updateOne(
          { _id: existing._id } as never,
          {
            $set: {
              ...(needsQuestions ? { customQuestions: snapshot } : {}),
              ...(needsLanguage ? { voiceLanguage } : {}),
              updatedAt: new Date(),
            },
          } as never,
        );
      }
      return NextResponse.json({
        interviewId: idHex(existing._id),
        status: "in_progress",
        jobTitle: existing.jobTitle,
        stageId: existing.stageId,
        voiceLanguage:
          parseTtsLanguage(existing.voiceLanguage) || voiceLanguage,
        customQuestions: questionsPayload(stageId, snapshot),
      });
    }

    const now = new Date();
    const doc: Omit<InterviewDocument, "_id"> = {
      jobId,
      applicantId: auth.user.id,
      applicantEmail: auth.user.email,
      stageId,
      status: "in_progress",
      jobTitle: job.title,
      jobOverview: job.overview ?? "",
      voiceLanguage,
      transcript: [],
      ...(isCustomQuestionsStage(stageId)
        ? { customQuestions: jobQuestions }
        : {}),
      startedAt: now,
      updatedAt: now,
    };

    try {
      const inserted = await interviews.insertOne({
        ...doc,
        _id: new ObjectId(),
      } as InterviewDocument);

      return NextResponse.json({
        interviewId: idHex(inserted.insertedId),
        status: "in_progress",
        jobTitle: job.title,
        stageId,
        voiceLanguage,
        customQuestions: questionsPayload(stageId, jobQuestions),
      });
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      const raced = await interviews.findOne({
        applicantId: auth.user.id,
        jobId,
        stageId,
      } as never);
      if (!raced) throw error;
      return NextResponse.json({
        interviewId: idHex(raced._id),
        status: raced.status,
        alreadyComplete: raced.status === "completed",
        jobTitle: raced.jobTitle,
        stageId: raced.stageId,
        voiceLanguage: parseTtsLanguage(raced.voiceLanguage) || voiceLanguage,
        customQuestions: questionsPayload(
          stageId,
          raced.customQuestions?.length ? raced.customQuestions : jobQuestions,
        ),
      });
    }
  } catch (error) {
    console.error("POST /api/interviews/start:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
