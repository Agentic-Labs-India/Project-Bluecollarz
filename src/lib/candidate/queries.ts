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
  CandidatePipelineStatus,
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
    } else if (
      (app.status === "applied" || app.status === "interviewing") &&
      app.jobStatus === "published"
    ) {
      stats.active += 1;
    } else {
      stats.closed += 1;
    }
  }
  return stats;
}

function toIsoDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value) return value;
  return new Date(0).toISOString();
}

/**
 * Roles the candidate has applied to OR interviewed for, with stage progress.
 * Newest activity first.
 */
export async function getCandidateApplications(
  userId: string,
): Promise<CandidateApplicationListItem[]> {
  await ensureIndexes();
  if (!userId) return [];

  const db = client.db(DB_NAME);
  const [applications, interviewDocs] = await Promise.all([
    db
      .collection<ApplicationDocument>(COLLECTIONS.APPLICATIONS)
      .find({ applicantId: matchId(userId) })
      .project({ jobId: 1, status: 1, createdAt: 1 })
      .toArray(),
    db
      .collection<InterviewDocument>(COLLECTIONS.INTERVIEWS)
      .find({ applicantId: matchId(userId) } as never)
      .project({
        jobId: 1,
        stageId: 1,
        status: 1,
        "analysis.overall": 1,
        startedAt: 1,
        updatedAt: 1,
      })
      .toArray(),
  ]);

  const applicationByJob = new Map<
    string,
    { id: string; status: CandidatePipelineStatus; createdAt: string }
  >();
  for (const app of applications) {
    const jobId = idHex(app.jobId);
    if (!jobId) continue;
    applicationByJob.set(jobId, {
      id: idHex(app._id),
      status: app.status ?? "applied",
      createdAt: toIsoDate(app.createdAt),
    });
  }

  const interviewsByJob = new Map<
    string,
    {
      byStage: Map<
        InterviewStageId,
        { status: CandidateInterviewStageStatus; overall: number | null }
      >;
      earliestStart: string;
    }
  >();

  for (const doc of interviewDocs) {
    const jobId = idHex(doc.jobId) || String(doc.jobId);
    if (!jobId) continue;
    const existing = interviewsByJob.get(jobId) ?? {
      byStage: new Map(),
      earliestStart: toIsoDate(doc.startedAt ?? doc.updatedAt),
    };
    existing.byStage.set(doc.stageId, {
      status: doc.status === "completed" ? "completed" : "in_progress",
      overall:
        doc.status === "completed" && doc.analysis?.overall != null
          ? doc.analysis.overall
          : null,
    });
    const started = toIsoDate(doc.startedAt ?? doc.updatedAt);
    if (started < existing.earliestStart) existing.earliestStart = started;
    interviewsByJob.set(jobId, existing);
  }

  const jobIdHexes = [
    ...new Set([...applicationByJob.keys(), ...interviewsByJob.keys()]),
  ];
  if (!jobIdHexes.length) return [];

  const jobs = await db
    .collection<JobDocument>(COLLECTIONS.JOBS)
    .find({ _id: { $in: matchIds(jobIdHexes) as never } })
    .project<{
      _id: unknown;
      title: string;
      pay: string;
      status: JobDocument["status"];
    }>({ title: 1, pay: 1, status: 1 })
    .toArray();

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

  const items: CandidateApplicationListItem[] = jobIdHexes.map((jobId) => {
    const job = jobById.get(jobId);
    const application = applicationByJob.get(jobId);
    const interview = interviewsByJob.get(jobId);
    const byStage = interview?.byStage;

    return {
      id: application?.id ?? `interviewing:${jobId}`,
      jobId,
      jobTitle: job?.title ?? "Role unavailable",
      jobPay: job?.pay ?? "—",
      jobStatus: job?.status ?? "missing",
      status: application?.status ?? "interviewing",
      appliedAt: application?.createdAt ?? interview?.earliestStart ?? new Date(0).toISOString(),
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

  items.sort(
    (a, b) =>
      new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime(),
  );
  return items;
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
