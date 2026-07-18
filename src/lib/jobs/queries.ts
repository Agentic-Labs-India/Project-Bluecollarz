import client, { DB_NAME, COLLECTIONS, matchId, matchIds } from "@/lib/db";
import {
  JOB_PRIORITIES,
  JOB_TABS,
  toOpportunity,
  type JobDocument,
} from "@/lib/jobs";
import type {
  ApplicationDocument,
  ApplicationStatus,
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
import type { KycFields } from "@/lib/kyc";

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
  /** Ensure this published job is in the result set (deep-link from home). */
  pinJobId?: string | null;
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
  const isWorkViewer =
    opts.viewerProfileType === "work" && Boolean(opts.viewerId);

  const [docs, total, userDoc, pinnedDoc] = await Promise.all([
    collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    collection.countDocuments(query),
    isWorkViewer
      ? db
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
          )
      : Promise.resolve(null),
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

  let appliedJobIds: string[] = [];
  let applicationStatuses: Record<string, ApplicationStatus> = {};
  let profileComplete = false;
  let kycVerified = false;
  let completedByJob = new Map<string, Set<string>>();

  if (isWorkViewer) {
    profileComplete = isCandidateProfileComplete(
      toCandidateProfileData(userDoc),
    );
    kycVerified = userDoc?.kycStatus === "verified";

    if (mergedDocs.length) {
      const jobIdHexes = mergedDocs.map((doc) => idHex(doc._id)).filter(Boolean);
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
    items: mergedDocs.map((doc) => {
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
    applicationStatuses,
    profileComplete,
    kycVerified,
  };
}
