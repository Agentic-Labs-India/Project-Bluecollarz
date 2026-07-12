import { NextRequest, NextResponse } from "next/server";
import client, { DB_NAME, COLLECTIONS, matchId } from "@/lib/db";
import {
  buildJobDocument,
  jobCreateSchema,
  parsePagination,
  toJobListItem,
  formatJobValidationError,
  sanitizeJobCreateBody,
  JOB_STATUSES,
  JOB_TABS,
  JOB_PRIORITIES,
  type JobDocument,
} from "@/lib/jobs";
import { getPublishedOpportunities } from "@/lib/jobs/queries";
import { ensureIndexes } from "@/lib/db/indexes";
import { requireUser, requireProfile } from "@/lib/api/session";
import { getHireProfileComplete } from "@/lib/hire/queries";

export async function GET(req: NextRequest) {
  try {
    await ensureIndexes();

    const sp = req.nextUrl.searchParams;
    const scope = sp.get("scope") || "public";
    const { page, limit, skip } = parsePagination(sp);
    const search = sp.get("search")?.trim() || "";
    const tab = sp.get("tab")?.trim() || "";
    const priority = sp.get("priority")?.trim() || "";

    // Public scope: published opportunities for the signed-in viewer.
    if (scope !== "mine") {
      const authResult = await requireUser();
      if (!authResult.ok) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status });
      }
      const result = await getPublishedOpportunities({
        viewerId: authResult.user.id,
        viewerProfileType: authResult.user.profileType,
        tab,
        search,
        priority,
        page,
        limit,
      });
      return NextResponse.json(result);
    }

    // "mine" scope: a hirer's own postings (any status), as list items.
    const hireAuth = await requireProfile("hire");
    if (!hireAuth.ok) {
      return NextResponse.json({ error: hireAuth.error }, { status: hireAuth.status });
    }

    if (!hireAuth.user.id) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    const status = sp.get("status")?.trim() || "";
    const query: Record<string, unknown> = { ownerId: matchId(hireAuth.user.id) };
    if (status && (JOB_STATUSES as readonly string[]).includes(status)) {
      query.status = status;
    }
    if (tab && (JOB_TABS as readonly string[]).includes(tab)) {
      query.tab = tab;
    }
    if (priority && (JOB_PRIORITIES as readonly string[]).includes(priority)) {
      query.priority = priority;
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
      collection.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      collection.countDocuments(query),
    ]);

    return NextResponse.json({
      items: docs.map(toJobListItem),
      total,
      page,
      limit,
      pageCount: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    console.error("GET /api/jobs:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureIndexes();

    const hireAuth = await requireProfile("hire");
    if (!hireAuth.ok) {
      return NextResponse.json({ error: hireAuth.error }, { status: hireAuth.status });
    }

    if (!(await getHireProfileComplete(hireAuth.user.id))) {
      return NextResponse.json(
        {
          error: "Complete your company profile before posting a role.",
          code: "PROFILE_INCOMPLETE",
        },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = jobCreateSchema.safeParse(sanitizeJobCreateBody(body));
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: formatJobValidationError(parsed.error),
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    // Store ownerId as the session hex string (compatible with dual-match queries).
    const doc = buildJobDocument(parsed.data, hireAuth.user);

    const db = client.db(DB_NAME);
    const result = await db.collection(COLLECTIONS.JOBS).insertOne(doc);

    return NextResponse.json(
      {
        id: result.insertedId.toString(),
        item: toJobListItem({ _id: result.insertedId, ...doc }),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/jobs:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
