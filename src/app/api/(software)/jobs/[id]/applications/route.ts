import { NextRequest, NextResponse } from "next/server";
import type { Db } from "mongodb";
import client, { DB_NAME, COLLECTIONS, isId, matchId, matchIds } from "@/lib/db";
import type { JobDocument } from "@/lib/jobs";
import { parsePagination } from "@/lib/jobs";
import {
  APPLICATION_STATUSES,
  type ApplicantInterviewScore,
  type ApplicantListItem,
  type ApplicationDocument,
  type ApplicationStatus,
} from "@/lib/jobs/applications";
import type {
  CommunicationAnalysis,
  InterviewDocument,
  InterviewStageId,
} from "@/lib/interviews";
import { ensureIndexes } from "@/lib/db/indexes";
import { requireProfile } from "@/lib/api/session";
import { idHex } from "@/lib/utils";

type RouteContext = { params: Promise<{ id: string }> };

interface UserDoc {
  _id: unknown;
  name?: string;
  email?: string;
  image?: string;
}

function scoreFromAnalysis(
  analysis?: Pick<CommunicationAnalysis, "overall"> | CommunicationAnalysis | null,
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
  const full = analysis as CommunicationAnalysis;
  return {
    overall: analysis.overall,
    clarity: typeof full.clarity === "number" ? full.clarity : null,
    fluency: typeof full.fluency === "number" ? full.fluency : null,
    confidence: typeof full.confidence === "number" ? full.confidence : null,
    professionalism:
      typeof full.professionalism === "number" ? full.professionalism : null,
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

/**
 * Score filter values:
 * - all — no filter
 * - none — no completed score
 * - any — has a completed score
 * - min:N — overall >= N (e.g. min:7)
 */
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
    if (!Number.isFinite(min)) return true;
    return score != null && score >= min;
  }
  return true;
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
      .collection<UserDoc>(COLLECTIONS.USERS_COLLECTION)
      .find({ _id: { $in: matchIds(applicantHexes) as never } })
      .project({ name: 1, email: 1, image: 1 })
      .toArray(),
    db
      .collection<InterviewDocument>(COLLECTIONS.INTERVIEWS)
      .find({
        jobId: jobIdHex,
        applicantId: { $in: applicantHexes },
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
      stageId: interview.stageId as InterviewStageId,
      status: interview.status,
      ...scoreFromAnalysis(interview.analysis),
      completedAt: interview.completedAt?.toISOString(),
    });
    interviewsByApplicant.set(applicantId, list);
  }

  const userMap = new Map(users.map((user) => [idHex(user._id), user]));

  return docs.map((doc) => {
    const applicantHex = idHex(doc.applicantId);
    const user = userMap.get(applicantHex);
    return {
      id: idHex(doc._id),
      applicantId: applicantHex,
      name: user?.name ?? null,
      email: user?.email ?? doc.applicantEmail,
      image: user?.image ?? null,
      status: doc.status,
      appliedAt: doc.createdAt.toISOString(),
      interviews: interviewsByApplicant.get(applicantHex) ?? [],
    };
  });
}

/** List candidates who applied to a role. Hirer-only, owner-scoped. */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await ensureIndexes();

    const hireAuth = await requireProfile("hire");
    if (!hireAuth.ok) {
      return NextResponse.json({ error: hireAuth.error }, { status: hireAuth.status });
    }

    const { id } = await context.params;
    if (!isId(id) || !hireAuth.user.id) {
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

    const params = req.nextUrl.searchParams;
    const { page, limit, skip } = parsePagination(params);
    const search = (params.get("search") || "").trim().toLowerCase();
    const statusParam = (params.get("status") || "all").trim();
    const communicationFilter = (params.get("communication") || "all").trim();
    const domainFilter = (params.get("domain") || "all").trim();

    const applications = db.collection<ApplicationDocument>(
      COLLECTIONS.APPLICATIONS,
    );

    const jobIdHex = idHex(job._id) || id;
    const jobMatch = matchId(jobIdHex);

    const appQuery: Record<string, unknown> = { jobId: jobMatch };
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

    if (!needsInMemoryFilter) {
      const total = await applications.countDocuments(appQuery);
      const docs = await applications
        .find(appQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      const items = await enrichApplicants(db, jobIdHex, docs);

      return NextResponse.json({
        job: { id: jobIdHex, title: job.title, status: job.status },
        items,
        total,
        page,
        limit,
        pageCount: Math.max(1, Math.ceil(total / limit)),
      });
    }

    // Search / score filters require joining interviews — load matching apps,
    // enrich, filter, then page in memory (typical role lists stay modest).
    const docs = await applications
      .find(appQuery)
      .sort({ createdAt: -1 })
      .toArray();

    let items = await enrichApplicants(db, jobIdHex, docs);

    if (search) {
      items = items.filter((item) => {
        const name = (item.name ?? "").toLowerCase();
        const email = item.email.toLowerCase();
        return name.includes(search) || email.includes(search);
      });
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
    const pageItems = items.slice(skip, skip + limit);

    return NextResponse.json({
      job: { id: jobIdHex, title: job.title, status: job.status },
      items: pageItems,
      total,
      page,
      limit,
      pageCount: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error("GET /api/jobs/[id]/applications:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
