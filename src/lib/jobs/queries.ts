import { cacheLife, cacheTag, updateTag } from "next/cache";
import client, { DB_NAME, COLLECTIONS, matchId, matchIds } from "@/lib/db";
import {
  JOB_PRIORITIES,
  JOB_TABS,
  toOpportunity,
  type ApplicationStepTemplate,
  type JobDocument,
  type JobLocation,
  type JobPriority,
} from "@/lib/jobs";
import type {
  ApplicationDocument,
  ApplicationStatus,
} from "@/lib/jobs/applications";
import type { Opportunity, OpportunityTab } from "@/lib/opportunities";
import { asNumber, idHex } from "@/lib/utils";
import { ensureIndexes } from "@/lib/db/indexes";
import {
  isCandidateProfileComplete,
  toCandidateProfileData,
  type CandidateProfileFields,
} from "@/lib/candidate/profile";
import { getCompletedInterviewStagesByJob } from "@/lib/interviews/queries";
import type { KycFields } from "@/lib/kyc";

/** Shared tag so landing + explore job lists invalidate together. */
export const PUBLISHED_JOBS_CACHE_TAG = "published-jobs";

/** Bust daily published-job caches after hire mutates roles. */
export function revalidatePublishedJobsCache() {
  updateTag(PUBLISHED_JOBS_CACHE_TAG);
}

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
  /** Per-job application status for the signed-in candidate. */
  applicationStatuses: Record<string, ApplicationStatus>;
  profileComplete: boolean;
  /** True when the candidate has completed AI KYC identity verification. */
  kycVerified: boolean;
}

/** Serializable published job for the Data Cache (no Mongo ObjectIds / Dates). */
type CachedPublishedJob = {
  id: string;
  title: string;
  pay: string;
  tab: OpportunityTab;
  overview: string;
  location?: JobLocation;
  countryCode?: string;
  stateCode?: string;
  priority?: JobPriority;
  hiredThisMonth: number;
  publishedAt: string | null;
  applicationStepTemplates: ApplicationStepTemplate[];
};

function serializePublishedJob(doc: JobDocument): CachedPublishedJob {
  return {
    id: idHex(doc._id),
    title: doc.title,
    pay: doc.pay,
    tab: doc.tab,
    overview: doc.overview,
    location: doc.location,
    countryCode: doc.countryCode,
    stateCode: doc.stateCode,
    priority: doc.priority,
    hiredThisMonth: asNumber(doc.hiredThisMonth, 0),
    publishedAt: doc.publishedAt?.toISOString() ?? null,
    applicationStepTemplates: doc.applicationStepTemplates ?? [],
  };
}

function cachedJobToOpportunity(
  job: CachedPublishedJob,
  opts?: {
    profileComplete?: boolean;
    completedStageIds?: Iterable<string>;
  },
): Opportunity {
  return toOpportunity(
    {
      _id: job.id,
      ownerId: "",
      ownerEmail: "",
      title: job.title,
      pay: job.pay,
      tab: job.tab,
      overview: job.overview,
      location: job.location,
      countryCode: job.countryCode,
      stateCode: job.stateCode,
      priority: job.priority,
      applicationStepTemplates: job.applicationStepTemplates,
      status: "published",
      hiredThisMonth: job.hiredThisMonth,
      publishedAt: job.publishedAt ? new Date(job.publishedAt) : null,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    },
    opts,
  );
}

function buildPublishedJobsQuery(opts: {
  tab: string;
  search: string;
  priority: string;
}): Record<string, unknown> {
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
  if (opts.search) {
    query.$or = [
      { title: { $regex: opts.search, $options: "i" } },
      { pay: { $regex: opts.search, $options: "i" } },
      { overview: { $regex: opts.search, $options: "i" } },
      { location: { $regex: opts.search, $options: "i" } },
    ];
  }
  return query;
}

/**
 * Published jobs page for explore — cached for a day.
 * Viewer-specific application / KYC state is layered on outside this cache.
 */
async function getCachedPublishedJobPage(opts: {
  tab: string;
  search: string;
  priority: string;
  page: number;
  limit: number;
  pinJobId: string;
}): Promise<{ jobs: CachedPublishedJob[]; total: number }> {
  "use cache";
  cacheLife("days");
  cacheTag(PUBLISHED_JOBS_CACHE_TAG);

  await ensureIndexes();
  const skip = (opts.page - 1) * opts.limit;
  const query = buildPublishedJobsQuery(opts);
  const db = client.db(DB_NAME);
  const collection = db.collection<JobDocument>(COLLECTIONS.JOBS);

  const [docs, total, pinnedDoc] = await Promise.all([
    collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(opts.limit)
      .toArray(),
    collection.countDocuments(query),
    opts.pinJobId
      ? collection.findOne({
          _id: matchId(opts.pinJobId) as never,
          status: "published",
        })
      : Promise.resolve(null),
  ]);

  let mergedDocs = docs;
  if (pinnedDoc) {
    const pinId = idHex(pinnedDoc._id);
    if (!docs.some((d) => idHex(d._id) === pinId)) {
      mergedDocs = [pinnedDoc, ...docs];
    }
  }

  return {
    jobs: mergedDocs.map(serializePublishedJob),
    total,
  };
}

/** Latest published roles for the marketing landing page (no auth). */
export async function getLatestPublishedRoles(
  limit = 10,
): Promise<LandingRole[]> {
  "use cache";
  cacheLife("days");
  cacheTag(PUBLISHED_JOBS_CACHE_TAG);

  await ensureIndexes();
  const db = client.db(DB_NAME);
  const collection = db.collection<JobDocument>(COLLECTIONS.JOBS);
  const safeLimit = Math.min(20, Math.max(1, limit));

  const docs = await collection
    .find({ status: "published" })
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(safeLimit)
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
 * already applied to (work profiles only). Job list is cached daily.
 */
export async function getPublishedOpportunities(opts: {
  viewerId: string;
  viewerProfileType: string;
  tab?: string;
  search?: string;
  priority?: string;
  page?: number;
  limit?: number;
  /** Ensure this published job is in the result set (deep-link from home). */
  pinJobId?: string | null;
}): Promise<OpportunitiesResult> {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(50, Math.max(1, opts.limit ?? 50));
  const { jobs, total } = await getCachedPublishedJobPage({
    tab: opts.tab?.trim() ?? "",
    search: opts.search?.trim() ?? "",
    priority: opts.priority?.trim() ?? "",
    page,
    limit,
    pinJobId: opts.pinJobId?.trim() ?? "",
  });

  const isWorkViewer =
    opts.viewerProfileType === "work" && Boolean(opts.viewerId);

  let appliedJobIds: string[] = [];
  let applicationStatuses: Record<string, ApplicationStatus> = {};
  let profileComplete = false;
  let kycVerified = false;
  let completedByJob = new Map<string, Set<string>>();

  if (isWorkViewer) {
    await ensureIndexes();
    const db = client.db(DB_NAME);
    const userDoc = await db
      .collection<CandidateProfileFields & KycFields>(
        COLLECTIONS.USERS_COLLECTION,
      )
      .findOne(
        { _id: matchId(opts.viewerId) as never },
        {
          projection: {
            phoneNumber: 1,
            headline: 1,
            location: 1,
            yearsExperience: 1,
            skills: 1,
            workAuthorization: 1,
            summary: 1,
            education: 1,
            workExperience: 1,
            languages: 1,
            kycStatus: 1,
          },
        },
      );

    profileComplete = isCandidateProfileComplete(
      toCandidateProfileData(userDoc),
    );
    kycVerified = userDoc?.kycStatus === "verified";

    if (jobs.length) {
      const jobIdHexes = jobs.map((job) => job.id).filter(Boolean);
      const [applied, stages] = await Promise.all([
        db
          .collection<ApplicationDocument>(COLLECTIONS.APPLICATIONS)
          .find({
            applicantId: matchId(opts.viewerId),
            jobId: { $in: matchIds(jobIdHexes) },
          })
          .project({ jobId: 1, status: 1 })
          .toArray(),
        getCompletedInterviewStagesByJob({
          applicantId: opts.viewerId,
          jobIds: jobIdHexes,
        }),
      ]);
      applicationStatuses = {};
      for (const app of applied) {
        const jobId = idHex(app.jobId);
        if (!jobId) continue;
        applicationStatuses[jobId] = app.status ?? "applied";
      }
      appliedJobIds = Object.keys(applicationStatuses);
      completedByJob = stages;
    }
  }

  return {
    items: jobs.map((job) =>
      cachedJobToOpportunity(job, {
        profileComplete,
        completedStageIds: completedByJob.get(job.id),
      }),
    ),
    total,
    page,
    limit,
    pageCount: Math.ceil(total / limit) || 1,
    appliedJobIds,
    applicationStatuses,
    profileComplete,
    kycVerified,
  };
}
