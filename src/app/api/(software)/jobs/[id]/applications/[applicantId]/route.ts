import { NextRequest, NextResponse } from "next/server";
import client, { DB_NAME, COLLECTIONS, isId, matchId } from "@/lib/db";
import type { JobDocument } from "@/lib/jobs";
import {
  APPLICATION_STATUSES,
  type ApplicationDocument,
  type ApplicationStatus,
} from "@/lib/jobs/applications";
import type { InterviewDocument } from "@/lib/interviews";
import {
  toCandidateProfileData,
  type CandidateProfileFields,
} from "@/lib/candidate/profile";
import { toKycPublicState, type KycFields } from "@/lib/kyc";
import { ensureIndexes } from "@/lib/db/indexes";
import { requireProfile } from "@/lib/api/session";
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
      return NextResponse.json({ error: hireAuth.error }, { status: hireAuth.status });
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
      .collection<
        CandidateProfileFields &
          KycFields & {
            name?: string;
            email?: string;
            image?: string;
          }
      >(COLLECTIONS.USERS_COLLECTION)
      .findOne({ _id: matchId(applicantId) as never });

    const profile = toCandidateProfileData(user);
    const kycState = toKycPublicState(user);
    // Hirers only see document URLs after AI KYC passed.
    const kyc = kycState.verified
      ? {
          verified: true as const,
          verifiedAt: kycState.verifiedAt,
          documents: kycState.documents,
          summary: kycState.analysis?.summary ?? null,
          deferred: kycState.deferred,
        }
      : {
          verified: false as const,
          verifiedAt: null,
          documents: {} as typeof kycState.documents,
          summary: null,
          deferred: {
            pan: false,
            passport: false,
            undertakingAcceptedAt: null,
          },
        };

    const interviewDocs = await db
      .collection<InterviewDocument>(COLLECTIONS.INTERVIEWS)
      .find({
        jobId: jobIdHex,
        applicantId,
      } as never)
      .sort({ startedAt: 1 })
      .toArray();

    const interviews = interviewDocs.map((doc) => ({
      id: idHex(doc._id),
      stageId: doc.stageId,
      status: doc.status,
      jobTitle: doc.jobTitle,
      analysis: doc.analysis ?? null,
      videoUrl: doc.videoUrl ?? null,
      customQuestions: doc.customQuestions ?? [],
      customAnswers: doc.customAnswers ?? [],
      transcript: (doc.transcript ?? []).map((t) => ({
        role: t.role,
        text: t.text,
        at: t.at instanceof Date ? t.at.toISOString() : String(t.at),
      })),
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
      profile: {
        ...profile,
        email: profile.email || application.applicantEmail,
      },
      kyc,
      interviews,
    });
  } catch (error) {
    console.error("GET /api/jobs/[id]/applications/[applicantId]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
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
      return NextResponse.json({ error: hireAuth.error }, { status: hireAuth.status });
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
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
