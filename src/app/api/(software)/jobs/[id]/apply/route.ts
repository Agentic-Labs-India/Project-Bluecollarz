import { NextRequest, NextResponse } from "next/server";
import client, { DB_NAME, COLLECTIONS, isId, matchId } from "@/lib/db";
import type { JobDocument } from "@/lib/jobs";
import { normalizeStepTemplates } from "@/lib/jobs";
import type { ApplicationDocument } from "@/lib/jobs/applications";
import { ensureIndexes } from "@/lib/db/indexes";
import { requireProfile } from "@/lib/api/session";
import { idHex } from "@/lib/utils";
import {
  isCandidateProfileComplete,
  toCandidateProfileData,
  type CandidateProfileFields,
} from "@/lib/candidate/profile";
import { getCompletedInterviewStagesByJob } from "@/lib/interviews/queries";
import {
  INTERVIEW_STAGE_IDS,
  type InterviewStageId,
} from "@/lib/interviews";

type RouteContext = { params: Promise<{ id: string }> };

/** A work-profile user applies to a published job (idempotent). */
export async function POST(_req: NextRequest, context: RouteContext) {
  try {
    await ensureIndexes();

    const auth = await requireProfile("work");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await context.params;
    if (!isId(id) || !auth.user.id) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const db = client.db(DB_NAME);

    const userDoc = await db
      .collection<CandidateProfileFields>(COLLECTIONS.USERS_COLLECTION)
      .findOne({ _id: matchId(auth.user.id) as never });
    if (!isCandidateProfileComplete(toCandidateProfileData(userDoc))) {
      return NextResponse.json(
        {
          error:
            "Complete your profile (resume) before applying to this role.",
          code: "PROFILE_INCOMPLETE",
        },
        { status: 403 },
      );
    }

    const job = await db
      .collection<JobDocument>(COLLECTIONS.JOBS)
      .findOne({ _id: matchId(id) as never, status: "published" });

    if (!job) {
      return NextResponse.json(
        { error: "This role is no longer accepting applications." },
        { status: 404 },
      );
    }

    const stageSet = new Set<string>(INTERVIEW_STAGE_IDS);
    const requiredStages = normalizeStepTemplates(job.applicationStepTemplates)
      .map((s) => s.id)
      .filter((s): s is InterviewStageId => stageSet.has(s));

    if (requiredStages.length) {
      const completed = await getCompletedInterviewStagesByJob({
        applicantId: auth.user.id,
        jobIds: [id],
      });
      const done = completed.get(id) ?? new Set();
      const missing = requiredStages.filter((s) => !done.has(s));
      if (missing.length) {
        return NextResponse.json(
          {
            error: "Finish required interview stages before applying.",
            code: "INTERVIEW_INCOMPLETE",
            missing,
          },
          { status: 403 },
        );
      }
    }

    const jobId = idHex(job._id) || id;
    const applicantId = auth.user.id;

    await db.collection<ApplicationDocument>(COLLECTIONS.APPLICATIONS).updateOne(
      {
        applicantId: matchId(applicantId),
        jobId: matchId(jobId),
      },
      {
        $setOnInsert: {
          jobId,
          applicantId,
          applicantEmail: auth.user.email,
          status: "applied",
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );

    return NextResponse.json({ applied: true });
  } catch (error) {
    console.error("POST /api/jobs/[id]/apply:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
