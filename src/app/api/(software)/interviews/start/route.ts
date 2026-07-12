import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import client, { DB_NAME, COLLECTIONS, isId, matchId } from "@/lib/db";
import type { JobDocument } from "@/lib/jobs";
import { normalizeStepTemplates } from "@/lib/jobs";
import {
  formatInterviewError,
  interviewStartSchema,
  type InterviewDocument,
} from "@/lib/interviews";
import { ensureIndexes } from "@/lib/db/indexes";
import { requireProfile } from "@/lib/api/session";
import { idHex } from "@/lib/utils";
import {
  isCandidateProfileComplete,
  toCandidateProfileData,
  type CandidateProfileFields,
} from "@/lib/candidate/profile";

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}

/** Start (or resume) an AI interview stage for a published role. */
export async function POST(req: NextRequest) {
  try {
    await ensureIndexes();
    const auth = await requireProfile("work");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
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

    const userDoc = await db
      .collection<CandidateProfileFields>(COLLECTIONS.USERS_COLLECTION)
      .findOne({ _id: matchId(auth.user.id) as never });
    if (!isCandidateProfileComplete(toCandidateProfileData(userDoc))) {
      return NextResponse.json(
        {
          error: "Complete your profile before starting the interview.",
          code: "PROFILE_INCOMPLETE",
        },
        { status: 403 },
      );
    }

    const job = await db
      .collection<JobDocument>(COLLECTIONS.JOBS)
      .findOne({ _id: matchId(jobId) as never, status: "published" });
    if (!job) {
      return NextResponse.json(
        { error: "This role is no longer accepting interviews." },
        { status: 404 },
      );
    }

    const stages = normalizeStepTemplates(job.applicationStepTemplates);
    if (!stages.some((s) => s.id === stageId)) {
      return NextResponse.json(
        { error: "This interview stage is not enabled for the role." },
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
      return NextResponse.json({
        interviewId: idHex(existing._id),
        status: "completed",
        alreadyComplete: true,
      });
    }

    if (existing?.status === "in_progress") {
      return NextResponse.json({
        interviewId: idHex(existing._id),
        status: "in_progress",
        jobTitle: existing.jobTitle,
        stageId: existing.stageId,
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
      transcript: [],
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
      });
    }
  } catch (error) {
    console.error("POST /api/interviews/start:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
