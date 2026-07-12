import client, { DB_NAME, COLLECTIONS, matchId, matchIds } from "@/lib/db";
import {
  JOB_PRIORITIES,
  JOB_TABS,
  toOpportunity,
  type JobDocument,
} from "@/lib/jobs";
import type {
  ApplicationDocument,
  CandidateApplicationStats,
} from "@/lib/jobs/applications";
import type { Opportunity } from "@/lib/opportunities";
import { asNumber, idHex } from "@/lib/utils";
import { ensureIndexes } from "@/lib/db/indexes";
import {
  isCandidateProfileComplete,
  toCandidateProfileData,
  type CandidateProfileFields,
} from "@/lib/candidate/profile";
import { getCompletedInterviewStagesByJob } from "@/lib/interviews/queries";

/** Published role card on the marketing landing page. */
export interface LandingRole {
  id: string;
  title: string;
  pay: string;
  hiredThisMonth: number;
  applicantCount: number;
}

export interface OpportunitiesResult {
  items: Opportunity[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
  appliedJobIds: string[];
  profileComplete: boolean;
}

/** Latest published roles for the marketing landing page (no auth). */
export async function getLatestPublishedRoles(
  limit = 10,
): Promise<LandingRole[]> {
  await ensureIndexes();
  const db = client.db(DB_NAME);
  const collection = db.collection<JobDocument>(COLLECTIONS.JOBS);

  const docs = await collection
    .find({ status: "published" })
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(Math.min(20, Math.max(1, limit)))
    .toArray();

  if (!docs.length) return [];

  const jobIdHexes = docs.map((doc) => idHex(doc._id)).filter(Boolean);

  const grouped = await db
    .collection<ApplicationDocument>(COLLECTIONS.APPLICATIONS)
    .aggregate<{ _id: unknown; count: number }>([
      { $match: { jobId: { $in: matchIds(jobIdHexes) } } },
      { $group: { _id: "$jobId", count: { $sum: 1 } } },
    ])
    .toArray();

  const applicantsByJob = new Map(
    grouped.map((row) => [idHex(row._id), row.count]),
  );

  return docs.map((doc) => ({
    id: idHex(doc._id),
    title: doc.title,
    pay: doc.pay,
    hiredThisMonth: asNumber(doc.hiredThisMonth, 0),
    applicantCount: applicantsByJob.get(idHex(doc._id)) ?? 0,
  }));
}

/**
 * Published opportunities for a signed-in viewer, with the subset they have
 * already applied to (work profiles only).
 */
export async function getPublishedOpportunities(opts: {
  viewerId: string;
  viewerProfileType: string;
  tab?: string;
  search?: string;
  priority?: string;
  page?: number;
  limit?: number;
}): Promise<OpportunitiesResult> {
  await ensureIndexes();
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(50, Math.max(1, opts.limit ?? 50));
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = { status: "published" };
  if (opts.tab && (JOB_TABS as readonly string[]).includes(opts.tab)) {
    query.tab = opts.tab;
  }
  if (
    opts.priority &&
    (JOB_PRIORITIES as readonly string[]).includes(opts.priority)
  ) {
    query.priority = opts.priority;
  }
  const search = opts.search?.trim();
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { pay: { $regex: search, $options: "i" } },
      { overview: { $regex: search, $options: "i" } },
      { location: { $regex: search, $options: "i" } },
    ];
  }

  const db = client.db(DB_NAME);
  const collection = db.collection<JobDocument>(COLLECTIONS.JOBS);

  const [docs, total] = await Promise.all([
    collection.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    collection.countDocuments(query),
  ]);

  let appliedJobIds: string[] = [];
  let profileComplete = false;
  let completedByJob = new Map<string, Set<string>>();

  if (opts.viewerProfileType === "work" && opts.viewerId) {
    const userDoc = await db
      .collection<CandidateProfileFields>(COLLECTIONS.USERS_COLLECTION)
      .findOne({ _id: matchId(opts.viewerId) as never });
    profileComplete = isCandidateProfileComplete(
      toCandidateProfileData(userDoc),
    );

    if (docs.length) {
      const jobIdHexes = docs.map((doc) => idHex(doc._id)).filter(Boolean);
      const [applied, stages] = await Promise.all([
        db
          .collection<ApplicationDocument>(COLLECTIONS.APPLICATIONS)
          .find({
            applicantId: matchId(opts.viewerId),
            jobId: { $in: matchIds(jobIdHexes) },
          })
          .project({ jobId: 1 })
          .toArray(),
        getCompletedInterviewStagesByJob({
          applicantId: opts.viewerId,
          jobIds: jobIdHexes,
        }),
      ]);
      appliedJobIds = applied.map((a) => idHex(a.jobId));
      completedByJob = stages;
    }
  }

  return {
    items: docs.map((doc) => {
      const jobId = idHex(doc._id);
      return toOpportunity(doc, {
        profileComplete,
        completedStageIds: completedByJob.get(jobId),
      });
    }),
    total,
    page,
    limit,
    pageCount: Math.ceil(total / limit) || 1,
    appliedJobIds,
    profileComplete,
  };
}

/** Aggregate a candidate's application counts (active / selected / closed). */
export async function getCandidateApplicationStats(
  userId: string,
): Promise<CandidateApplicationStats> {
  await ensureIndexes();
  if (!userId) {
    return { active: 0, selected: 0, closed: 0, total: 0 };
  }

  const db = client.db(DB_NAME);

  const applications = await db
    .collection<ApplicationDocument>(COLLECTIONS.APPLICATIONS)
    .find({ applicantId: matchId(userId) })
    .project<{ status: ApplicationDocument["status"]; jobId: unknown }>({
      status: 1,
      jobId: 1,
    })
    .toArray();

  const jobIdHexes = applications.map((app) => idHex(app.jobId)).filter(Boolean);

  const jobs = jobIdHexes.length
    ? await db
        .collection<JobDocument>(COLLECTIONS.JOBS)
        .find({ _id: { $in: matchIds(jobIdHexes) as never } })
        .project<{ _id: unknown; status: JobDocument["status"] }>({ status: 1 })
        .toArray()
    : [];

  const jobStatusById = new Map(jobs.map((job) => [idHex(job._id), job.status]));

  const stats: CandidateApplicationStats = {
    active: 0,
    selected: 0,
    closed: 0,
    total: applications.length,
  };

  for (const app of applications) {
    const jobStatus = jobStatusById.get(idHex(app.jobId));
    if (app.status === "selected") {
      stats.selected += 1;
    } else if (app.status === "applied" && jobStatus === "published") {
      stats.active += 1;
    } else {
      stats.closed += 1;
    }
  }

  return stats;
}
