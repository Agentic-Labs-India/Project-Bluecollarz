import client, { DB_NAME, COLLECTIONS, matchId, matchIds } from "@/lib/db";
import {
  isCandidateProfileComplete,
  toCandidateProfileData,
  type CandidateProfileData,
  type CandidateProfileFields,
} from "@/lib/candidate/profile";
import type { JobDocument } from "@/lib/jobs";
import type {
  ApplicationDocument,
  CandidateApplicationListItem,
  CandidateApplicationStats,
  CandidateInterviewStageStatus,
} from "@/lib/jobs/applications";
import {
  INTERVIEW_STAGE_IDS,
  type InterviewDocument,
  type InterviewStageId,
} from "@/lib/interviews";
import { ensureIndexes } from "@/lib/db/indexes";
import { idHex } from "@/lib/utils";

type UserDoc = CandidateProfileFields & {
  _id: unknown;
  name?: string;
  email?: string;
  image?: string;
  profileType?: string;
};

export async function getCandidateProfileByUserId(
  userId: string,
): Promise<CandidateProfileData | null> {
  if (!userId) return null;
  const db = client.db(DB_NAME);
  const doc = await db
    .collection<UserDoc>(COLLECTIONS.USERS_COLLECTION)
    .findOne({ _id: matchId(userId) as never });
  if (!doc) return null;
  return toCandidateProfileData(doc);
}

export async function isCandidateOnboardingDone(
  userId: string,
): Promise<boolean> {
  const profile = await getCandidateProfileByUserId(userId);
  if (!profile) return false;
  // Always validate live mandatory fields (not only the stored flag),
  // so newly required fields re-open onboarding for incomplete profiles.
  return isCandidateProfileComplete(profile);
}

function statsFromApplications(
  applications: CandidateApplicationListItem[],
): CandidateApplicationStats {
  const stats: CandidateApplicationStats = {
    active: 0,
    selected: 0,
    closed: 0,
    total: applications.length,
  };
  for (const app of applications) {
    if (app.status === "selected") {
      stats.selected += 1;
    } else if (app.status === "applied" && app.jobStatus === "published") {
      stats.active += 1;
    } else {
      stats.closed += 1;
    }
  }
  return stats;
}

/**
 * All applications for a candidate, with job details + AI interview progress.
 * Newest applications first.
 */
export async function getCandidateApplications(
  userId: string,
): Promise<CandidateApplicationListItem[]> {
  await ensureIndexes();
  if (!userId) return [];

  const db = client.db(DB_NAME);
  const applications = await db
    .collection<ApplicationDocument>(COLLECTIONS.APPLICATIONS)
    .find({ applicantId: matchId(userId) })
    .project({ jobId: 1, status: 1, createdAt: 1 })
    .sort({ createdAt: -1 })
    .toArray();

  if (!applications.length) return [];

  const jobIdHexes = applications
    .map((app) => idHex(app.jobId))
    .filter(Boolean);

  const [jobs, interviewDocs] = await Promise.all([
    db
      .collection<JobDocument>(COLLECTIONS.JOBS)
      .find({ _id: { $in: matchIds(jobIdHexes) as never } })
      .project<{
        _id: unknown;
        title: string;
        pay: string;
        status: JobDocument["status"];
      }>({ title: 1, pay: 1, status: 1 })
      .toArray(),
    db
      .collection<InterviewDocument>(COLLECTIONS.INTERVIEWS)
      .find({
        applicantId: matchId(userId),
        jobId: { $in: jobIdHexes },
      } as never)
      .project({
        jobId: 1,
        stageId: 1,
        status: 1,
        "analysis.overall": 1,
      })
      .toArray(),
  ]);

  const jobById = new Map(
    jobs.map((job) => [
      idHex(job._id),
      {
        title: job.title,
        pay: job.pay,
        status: job.status,
      },
    ]),
  );

  const interviewsByJob = new Map<
    string,
    Map<
      InterviewStageId,
      { status: CandidateInterviewStageStatus; overall: number | null }
    >
  >();

  for (const doc of interviewDocs) {
    const jobId = idHex(doc.jobId) || String(doc.jobId);
    const byStage =
      interviewsByJob.get(jobId) ??
      new Map<
        InterviewStageId,
        { status: CandidateInterviewStageStatus; overall: number | null }
      >();
    byStage.set(doc.stageId, {
      status: doc.status === "completed" ? "completed" : "in_progress",
      overall:
        doc.status === "completed" && doc.analysis?.overall != null
          ? doc.analysis.overall
          : null,
    });
    interviewsByJob.set(jobId, byStage);
  }

  return applications.map((app) => {
    const jobId = idHex(app.jobId);
    const job = jobById.get(jobId);
    const byStage = interviewsByJob.get(jobId);

    return {
      id: idHex(app._id),
      jobId,
      jobTitle: job?.title ?? "Role unavailable",
      jobPay: job?.pay ?? "—",
      jobStatus: job?.status ?? "missing",
      status: app.status ?? "applied",
      appliedAt:
        app.createdAt instanceof Date
          ? app.createdAt.toISOString()
          : String(app.createdAt),
      interviews: INTERVIEW_STAGE_IDS.map((stageId) => {
        const hit = byStage?.get(stageId);
        return {
          stageId,
          status: hit?.status ?? "not_started",
          overall: hit?.overall ?? null,
        };
      }),
    };
  });
}

/** One DB pass for candidate home: applications list + derived stat cards. */
export async function getCandidateDashboard(userId: string): Promise<{
  applications: CandidateApplicationListItem[];
  stats: CandidateApplicationStats;
}> {
  const applications = await getCandidateApplications(userId);
  return {
    applications,
    stats: statsFromApplications(applications),
  };
}

/** Title of a published role (for KYC / deep-link context). */
export async function getPublishedJobTitle(
  jobId: string,
): Promise<string | null> {
  if (!jobId) return null;
  await ensureIndexes();
  const job = await client
    .db(DB_NAME)
    .collection<JobDocument>(COLLECTIONS.JOBS)
    .findOne(
      { _id: matchId(jobId) as never, status: "published" },
      { projection: { title: 1 } },
    );
  return job?.title ?? null;
}
