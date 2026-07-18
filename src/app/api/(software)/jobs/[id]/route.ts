import { NextRequest, NextResponse } from "next/server";
import client, { DB_NAME, COLLECTIONS, isId, matchId } from "@/lib/db";
import {
  jobUpdateSchema,
  normalizeStepTemplates,
  toJobListItem,
  toOpportunity,
  formatJobValidationError,
  sanitizeJobCreateBody,
  type JobDocument,
} from "@/lib/jobs";
import { revalidatePublishedJobsCache } from "@/lib/jobs/queries";
import { ensureIndexes } from "@/lib/db/indexes";
import { requireUser, requireProfile } from "@/lib/api/session";
import { idHex } from "@/lib/utils";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await ensureIndexes();
    const { id } = await context.params;
    if (!isId(id)) {
      return NextResponse.json({ error: "Invalid job id" }, { status: 400 });
    }
    const db = client.db(DB_NAME);
    const doc = await db
      .collection<JobDocument>(COLLECTIONS.JOBS)
      .findOne({ _id: matchId(id) as never });

    if (!doc) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (doc.status !== "published") {
      const hireAuth = await requireProfile("hire");
      if (!hireAuth.ok || idHex(doc.ownerId) !== hireAuth.user.id) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }
    } else {
      const authResult = await requireUser();
      if (!authResult.ok) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status });
      }
    }

    const asOpportunity = req.nextUrl.searchParams.get("format") === "opportunity";
    return NextResponse.json({
      item: asOpportunity ? toOpportunity(doc) : toJobListItem(doc),
      form: {
        title: doc.title,
        pay: doc.pay,
        tab: doc.tab,
        overview: doc.overview,
        location: doc.location,
        countryCode: doc.countryCode,
        stateCode: doc.stateCode,
        priority: doc.priority,
        applicationStepTemplates: doc.applicationStepTemplates,
      },
    });
  } catch (error) {
    console.error("GET /api/jobs/[id]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
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

    const body = await req.json().catch(() => null);
    const parsed = jobUpdateSchema.safeParse(sanitizeJobCreateBody(body));
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: formatJobValidationError(parsed.error),
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }
    const db = client.db(DB_NAME);
    const collection = db.collection<JobDocument>(COLLECTIONS.JOBS);

    const existing = await collection.findOne({
      _id: matchId(id) as never,
      ownerId: matchId(hireAuth.user.id),
    });
    if (!existing) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const now = new Date();
    const { action, publish, applicationStepTemplates, ...fields } = parsed.data;
    const $set: Record<string, unknown> = { updatedAt: now };
    const $unset: Record<string, ""> = {};

    for (const [key, value] of Object.entries(fields)) {
      if (value === null && (key === "countryCode" || key === "stateCode")) {
        $unset[key] = "";
      } else if (value !== undefined && value !== null) {
        $set[key] = value;
      }
    }

    if (applicationStepTemplates !== undefined) {
      $set.applicationStepTemplates = normalizeStepTemplates(applicationStepTemplates);
    }

    if (action === "publish" || publish === true) {
      $set.status = "published";
      $set.publishedAt = existing.publishedAt ?? now;
    } else if (action === "close") {
      $set.status = "closed";
    } else if (action === "reopen") {
      $set.status = "published";
      $set.publishedAt = existing.publishedAt ?? now;
    } else if (fields.status) {
      if (fields.status === "published" && !existing.publishedAt) {
        $set.publishedAt = now;
      }
    }

    const updateDoc: { $set: Record<string, unknown>; $unset?: Record<string, ""> } = {
      $set,
    };
    if (Object.keys($unset).length) updateDoc.$unset = $unset;

    await collection.updateOne(
      { _id: matchId(id) as never, ownerId: matchId(hireAuth.user.id) },
      updateDoc,
    );
    const updated = await collection.findOne({ _id: matchId(id) as never });
    if (!updated) {
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    if (
      existing.status === "published" ||
      updated.status === "published" ||
      existing.status !== updated.status
    ) {
      revalidatePublishedJobsCache();
    }

    return NextResponse.json({ item: toJobListItem(updated) });
  } catch (error) {
    console.error("PATCH /api/jobs/[id]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const hireAuth = await requireProfile("hire");
    if (!hireAuth.ok) {
      return NextResponse.json({ error: hireAuth.error }, { status: hireAuth.status });
    }

    const { id } = await context.params;
    if (!isId(id) || !hireAuth.user.id) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const db = client.db(DB_NAME);
    const result = await db.collection(COLLECTIONS.JOBS).deleteOne({
      _id: matchId(id) as never,
      ownerId: matchId(hireAuth.user.id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    revalidatePublishedJobsCache();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/jobs/[id]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
