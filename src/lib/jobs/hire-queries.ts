import "server-only";

import type { Db } from "mongodb";
import {
  type CandidateProfileFields,
  toCandidateProfileData,
} from "@/lib/candidate/profile";
import { toHireSafeProfile } from "@/lib/compliance/arm";
import {
  hasGrantedPurposes,
  INTERVIEW_RELEASE_REQUIRED_PURPOSES,
  principalsWithGrantedPurposes,
} from "@/lib/compliance/consent";
import client, { COLLECTIONS, DB_NAME, isId, matchId, matchIds } from "@/lib/db";
import { ensureIndexes } from "@/lib/db/indexes";
import type {
  CommunicationAnalysis,
  InterviewDocument,
  InterviewStageId,
} from "@/lib/interviews";
import {
  JOB_PRIORITIES,
  JOB_STATUSES,
  JOB_TABS,
  type JobDocument,
  type JobEditorPayload,
  type JobPriority,
  type JobStatus,
  pageBounds,
  parseCustomQuestions,
  resolveStepTemplates,
  toJobListItem,
} from "@/lib/jobs";
import type {
  ApplicantDetail,
  ApplicantInterviewScore,
  ApplicantListItem,
  ApplicationDocument,
  ApplicationStatus,
  PaginatedApplicantsResponse,
} from "@/lib/jobs/applications";
import { APPLICATION_STATUSES } from "@/lib/jobs/applications";
import { idHex } from "@/lib/utils";

export interface HireJobsListInput {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  tab?: string;
  priority?: string;
}

function scoreFromAnalysis(
  analysis?: CommunicationAnalysis | null,
): Pick<
  ApplicantInterviewScore,
  "overall" | "clarity" | "fluency" | "confidence" | "professionalism"
> {
  if (!analysis || typeof analysis.overall !== "number") {
    return {
      overall: null,
      clarity: null,
      fluency: null,
      confidence: null,
      professionalism: null,
    };
  }
  return {
    overall: analysis.overall,
    clarity: typeof analysis.clarity === "number" ? analysis.clarity : null,
    fluency: typeof analysis.fluency === "number" ? analysis.fluency : null,
    confidence:
      typeof analysis.confidence === "number" ? analysis.confidence : null,
    professionalism:
      typeof analysis.professionalism === "number"
        ? analysis.professionalism
        : null,
  };
}

function overallFor(
  interviews: ApplicantInterviewScore[],
  stageId: InterviewStageId,
): number | null {
  const hit = interviews.find(
    (i) => i.stageId === stageId && i.status === "completed",
  );
  return hit?.overall ?? null;
}

function matchesScoreFilter(
  interviews: ApplicantInterviewScore[],
  stageId: InterviewStageId,
  filter: string,
): boolean {
  if (!filter || filter === "all") return true;
  const score = overallFor(interviews, stageId);
  if (filter === "none") return score == null;
  if (filter === "any") return score != null;
  if (filter.startsWith("min:")) {
    const min = Number(filter.slice(4));
    if (!Number.isFinite(min)) return false;
    return score != null && score >= min;
  }
  return false;
}

async function enrichApplicants(
  db: Db,
  jobIdHex: string,
  docs: ApplicationDocument[],
): Promise<ApplicantListItem[]> {
  const applicantHexes = docs
    .map((doc) => idHex(doc.applicantId))
    .filter(Boolean);
  if (!applicantHexes.length) return [];

  const [users, interviews] = await Promise.all([
    db
      .collection<{ _id: unknown; name?: string; image?: string }>(
        COLLECTIONS.USERS_COLLECTION,
      )
      .find({ _id: { $in: matchIds(applicantHexes) as never } })
      .project({ name: 1, image: 1 })
      .toArray(),
    db
      .collection<InterviewDocument>(COLLECTIONS.INTERVIEWS)
      .find({
        jobId: jobIdHex,
        applicantId: { $in: matchIds(applicantHexes) },
      } as never)
      .project({
        applicantId: 1,
        stageId: 1,
        status: 1,
        "analysis.overall": 1,
        completedAt: 1,
      })
      .toArray(),
  ]);

  const interviewsByApplicant = new Map<string, ApplicantInterviewScore[]>();
  for (const interview of interviews) {
    const applicantId =
      idHex(interview.applicantId) || String(interview.applicantId);
    const list = interviewsByApplicant.get(applicantId) ?? [];
    list.push({
      stageId: interview.stageId,
      status: interview.status,
      ...scoreFromAnalysis(interview.analysis),
      completedAt: interview.completedAt?.toISOString(),
    });
    interviewsByApplicant.set(applicantId, list);
  }

  const userMap = new Map(users.map((user) => [idHex(user._id), user]));
  const interviewReleaseOk = await principalsWithGrantedPurposes(
    applicantHexes,
    INTERVIEW_RELEASE_REQUIRED_PURPOSES,
  );

  return docs.map((doc) => {
    const applicantHex = idHex(doc.applicantId);
    const user = userMap.get(applicantHex);
    return {
      id: idHex(doc._id),
      applicantId: applicantHex,
      name: user?.name ?? null,
      image: user?.image ?? null,
      status: doc.status,
      appliedAt: doc.createdAt.toISOString(),
      interviews: interviewReleaseOk.has(applicantHex)
        ? (interviewsByApplicant.get(applicantHex) ?? [])
        : [],
    };
  });
}

export async function listHireJobs(
  ownerId: string,
  input: HireJobsListInput,
): Promise<{
  items: ReturnType<typeof toJobListItem>[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
}> {
  await ensureIndexes();
  const { page, limit, skip } = pageBounds(input.page, input.limit);
  const search = input.search?.trim() ?? "";
  const query: Record<string, unknown> = {
    ownerId: matchId(ownerId),
  };
  if (
    input.status &&
    (JOB_STATUSES as readonly string[]).includes(input.status)
  ) {
    query.status = input.status as JobStatus;
  }
  if (input.tab && (JOB_TABS as readonly string[]).includes(input.tab)) {
    query.tab = input.tab;
  }
  if (
    input.priority &&
    (JOB_PRIORITIES as readonly string[]).includes(input.priority)
  ) {
    query.priority = input.priority as JobPriority;
  }
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
    collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    collection.countDocuments(query),
  ]);

  const jobIdHexes = docs.map((doc) => idHex(doc._id)).filter(Boolean);
  const applicantCounts = new Map<string, number>();
  if (jobIdHexes.length) {
    const grouped = await db
      .collection<ApplicationDocument>(COLLECTIONS.APPLICATIONS)
      .aggregate<{ _id: unknown; count: number }>([
        { $match: { jobId: { $in: matchIds(jobIdHexes) } } },
        { $group: { _id: "$jobId", count: { $sum: 1 } } },
      ])
      .toArray();
    for (const row of grouped) {
      applicantCounts.set(idHex(row._id), row.count);
    }
  }

  return {
    items: docs.map((doc) =>
      toJobListItem(doc, {
        applicantCount: applicantCounts.get(idHex(doc._id)) ?? 0,
      }),
    ),
    total,
    page,
    limit,
    pageCount: Math.ceil(total / limit) || 1,
  };
}

export async function getOwnedJobEditor(
  ownerId: string,
  jobId: string,
): Promise<JobEditorPayload | null> {
  if (!isId(jobId)) return null;
  await ensureIndexes();
  const db = client.db(DB_NAME);
  const doc = await db.collection<JobDocument>(COLLECTIONS.JOBS).findOne({
    _id: matchId(jobId) as never,
    ownerId: matchId(ownerId),
  });
  if (!doc) return null;

  return {
    item: toJobListItem(doc),
    form: {
      title: doc.title,
      payAmount: doc.payAmount,
      payType: doc.payType,
      payCurrency: doc.payCurrency,
      tab: doc.tab,
      overview: doc.overview,
      location: doc.location,
      countryCode: doc.countryCode,
      stateCode: doc.stateCode,
      priority: doc.priority,
      applicationStepTemplates: resolveStepTemplates(
        doc.applicationStepTemplates,
      ),
      customQuestions: parseCustomQuestions(doc.customQuestions),
      raRcNumber: doc.raRcNumber ?? null,
    },
  };
}

export interface ApplicantListInput {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  communication?: string;
  domain?: string;
}

export async function listOwnedJobApplicants(
  ownerId: string,
  jobId: string,
  input: ApplicantListInput,
): Promise<PaginatedApplicantsResponse | null> {
  if (!isId(jobId)) return null;
  await ensureIndexes();
  const db = client.db(DB_NAME);
  const job = await db.collection<JobDocument>(COLLECTIONS.JOBS).findOne({
    _id: matchId(jobId) as never,
    ownerId: matchId(ownerId),
  });
  if (!job) return null;

  const { page, limit, skip } = pageBounds(input.page, input.limit);
  const search = (input.search ?? "").trim().toLowerCase();
  const statusParam = (input.status ?? "all").trim();
  const communicationFilter = (input.communication ?? "all").trim();
  const domainFilter = (input.domain ?? "all").trim();

  const applications = db.collection<ApplicationDocument>(
    COLLECTIONS.APPLICATIONS,
  );
  const jobIdHex = idHex(job._id) || jobId;
  const appQuery: Record<string, unknown> = { jobId: matchId(jobIdHex) };
  if (
    statusParam !== "all" &&
    (APPLICATION_STATUSES as readonly string[]).includes(statusParam)
  ) {
    appQuery.status = statusParam as ApplicationStatus;
  }

  const needsInMemoryFilter =
    Boolean(search) ||
    communicationFilter !== "all" ||
    domainFilter !== "all";

  const jobMeta = { id: jobIdHex, title: job.title, status: job.status };

  if (!needsInMemoryFilter) {
    const total = await applications.countDocuments(appQuery);
    const docs = await applications
      .find(appQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    const items = await enrichApplicants(db, jobIdHex, docs);
    return {
      job: jobMeta,
      items,
      total,
      page,
      limit,
      pageCount: Math.max(1, Math.ceil(total / limit)),
    };
  }

  const docs = await applications
    .find(appQuery)
    .sort({ createdAt: -1 })
    .toArray();
  let items = await enrichApplicants(db, jobIdHex, docs);
  if (search) {
    items = items.filter((item) =>
      (item.name ?? "").toLowerCase().includes(search),
    );
  }
  items = items.filter(
    (item) =>
      matchesScoreFilter(
        item.interviews,
        "ai-communication",
        communicationFilter,
      ) && matchesScoreFilter(item.interviews, "ai-domain", domainFilter),
  );
  const total = items.length;
  return {
    job: jobMeta,
    items: items.slice(skip, skip + limit),
    total,
    page,
    limit,
    pageCount: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getOwnedApplicantDetail(
  ownerId: string,
  jobId: string,
  applicantId: string,
): Promise<ApplicantDetail | null> {
  if (!isId(jobId) || !isId(applicantId)) return null;
  await ensureIndexes();

  const db = client.db(DB_NAME);
  const job = await db.collection<JobDocument>(COLLECTIONS.JOBS).findOne({
    _id: matchId(jobId) as never,
    ownerId: matchId(ownerId),
  });
  if (!job) return null;

  const jobIdHex = idHex(job._id) || jobId;
  const application = await db
    .collection<ApplicationDocument>(COLLECTIONS.APPLICATIONS)
    .findOne({
      jobId: matchId(jobIdHex) as never,
      applicantId: matchId(applicantId) as never,
    });
  if (!application) return null;

  const user = await db
    .collection<CandidateProfileFields & { name?: string; image?: string }>(
      COLLECTIONS.USERS_COLLECTION,
    )
    .findOne({ _id: matchId(applicantId) as never });
  if (!user) return null;

  const profile = toHireSafeProfile(toCandidateProfileData(user));
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

  return {
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
    interviews: interviewDocs.map((doc) => ({
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
    })),
  };
}
