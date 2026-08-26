import { type NextRequest, NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth/session";
import {
  type CandidateProfileFields,
  toCandidateProfileData,
} from "@/lib/candidate/profile";
import { toHireSafeProfile } from "@/lib/compliance/arm";
import {
  hasGrantedPurposes,
  INTERVIEW_RELEASE_REQUIRED_PURPOSES,
} from "@/lib/compliance/consent";
import client, { COLLECTIONS, DB_NAME, isId, matchId } from "@/lib/db";
import { ensureIndexes } from "@/lib/db/indexes";
import type { InterviewDocument } from "@/lib/interviews";
import type { JobDocument } from "@/lib/jobs";
import {
  APPLICATION_STATUSES,
  type ApplicationDocument,
  type ApplicationStatus,
} from "@/lib/jobs/applications";
import { idHex } from "@/lib/utils";

type RouteContext = {
  params: Promise<{ id: string; applicantId: string }>;
};

/**
 * Hirer view of one applicant for a role: profile (resume) + interview results.
 */
export async function GET(_req: Request, context: RouteContext) {
  try {
    await ensureIndexes();

    const hireAuth = await requireProfile("hire");
    if (!hireAuth.ok) {
      return NextResponse.json(
        { error: hireAuth.error },
        { status: hireAuth.status },
      );
    }
    if (!hireAuth.user.id) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    const { id, applicantId } = await context.params;
    if (!isId(id) || !isId(applicantId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const db = client.db(DB_NAME);
    const job = await db.collection<JobDocument>(COLLECTIONS.JOBS).findOne({
      _id: matchId(id) as never,
      ownerId: matchId(hireAuth.user.id),
    });
    if (!job) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    const jobIdHex = idHex(job._id) || id;
    const application = await db
      .collection<ApplicationDocument>(COLLECTIONS.APPLICATIONS)
      .findOne({
        jobId: matchId(jobIdHex) as never,
        applicantId: matchId(applicantId) as never,
      });
    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 },
      );
    }

    const user = await db
      .collection<CandidateProfileFields & { name?: string; image?: string }>(
        COLLECTIONS.USERS_COLLECTION,
      )
      .findOne({ _id: matchId(applicantId) as never });

    const rawProfile = toCandidateProfileData(user);
    /** Allowlisted resume fields — never email/phone/IDs. */
    const profile = toHireSafeProfile({
      ...rawProfile,
    } as Record<string, unknown>);
    const interviewReleaseOk = await hasGrantedPurposes(
      applicantId,
      INTERVIEW_RELEASE_REQUIRED_PURPOSES,
    );

    const interviewDocs = await db
      .collection<InterviewDocument>(COLLECTIONS.INTERVIEWS)
      .find({
        jobId: jobIdHex,
        applicantId: matchId(applicantId),
      } as never)
      .sort({ startedAt: 1 })
      .toArray();

    const interviews = interviewDocs.map((doc) => ({
      id: idHex(doc._id),
      stageId: doc.stageId,
      status: doc.status,
      jobTitle: doc.jobTitle,
      analysis: interviewReleaseOk ? (doc.analysis ?? null) : null,
      videoUrl: interviewReleaseOk ? (doc.videoUrl ?? null) : null,
      customQuestions: interviewReleaseOk ? (doc.customQuestions ?? []) : [],
      customAnswers: interviewReleaseOk ? (doc.customAnswers ?? []) : [],
      transcript: interviewReleaseOk
        ? (doc.transcript ?? []).map((t) => ({
            role: t.role,
            text: t.text,
            at: t.at instanceof Date ? t.at.toISOString() : String(t.at),
          }))
        : [],
      startedAt:
        doc.startedAt instanceof Date
          ? doc.startedAt.toISOString()
          : String(doc.startedAt),
      completedAt: doc.completedAt
        ? doc.completedAt instanceof Date
          ? doc.completedAt.toISOString()
          : String(doc.completedAt)
        : null,
    }));

    return NextResponse.json({
      job: {
        id: jobIdHex,
        title: job.title,
      },
      application: {
        id: idHex(application._id),
        status: application.status,
        appliedAt: application.createdAt.toISOString(),
      },
      profile,
      interviewRelease: interviewReleaseOk,
      interviews,
    });
  } catch (error) {
    console.error("GET /api/jobs/[id]/applications/[applicantId]:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

/**
 * Hirer updates an applicant's status (selected / rejected / applied).
 * Candidate dashboard stats read this same field.
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    await ensureIndexes();

    const hireAuth = await requireProfile("hire");
    if (!hireAuth.ok) {
      return NextResponse.json(
        { error: hireAuth.error },
        { status: hireAuth.status },
      );
    }
    if (!hireAuth.user.id) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    const { id, applicantId } = await context.params;
    if (!isId(id) || !isId(applicantId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const status = body?.status as string | undefined;
    if (
      !status ||
      !(APPLICATION_STATUSES as readonly string[]).includes(status)
    ) {
      return NextResponse.json(
        { error: "status must be applied, selected, or rejected" },
        { status: 400 },
      );
    }

    const db = client.db(DB_NAME);
    const job = await db.collection<JobDocument>(COLLECTIONS.JOBS).findOne({
      _id: matchId(id) as never,
      ownerId: matchId(hireAuth.user.id),
    });
    if (!job) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    const jobIdHex = idHex(job._id) || id;
    const result = await db
      .collection<ApplicationDocument>(COLLECTIONS.APPLICATIONS)
      .findOneAndUpdate(
        {
          jobId: matchId(jobIdHex) as never,
          applicantId: matchId(applicantId) as never,
        },
        { $set: { status: status as ApplicationStatus } },
        { returnDocument: "after" },
      );

    const application = result ?? null;
    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      application: {
        id: idHex(application._id),
        status: application.status,
        appliedAt: application.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("PATCH /api/jobs/[id]/applications/[applicantId]:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
