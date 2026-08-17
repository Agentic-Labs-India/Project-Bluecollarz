import { type NextRequest, NextResponse } from "next/server";
import { requireProfile, requireUser } from "@/lib/auth/session";
import client, { COLLECTIONS, DB_NAME, isId, matchId } from "@/lib/db";
import { ensureIndexes } from "@/lib/db/indexes";
import {
  formatJobPay,
  formatJobValidationError,
  type JobDocument,
  jobUpdateSchema,
  normalizeCustomQuestions,
  normalizeStepTemplates,
  sanitizeJobCreateBody,
  toJobListItem,
  toOpportunity,
} from "@/lib/jobs";
import { revalidatePublishedJobsCache } from "@/lib/jobs/queries";
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
        return NextResponse.json(
          { error: authResult.error },
          { status: authResult.status },
        );
      }
    }

    const asOpportunity =
      req.nextUrl.searchParams.get("format") === "opportunity";
    return NextResponse.json({
      item: asOpportunity ? toOpportunity(doc) : toJobListItem(doc),
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
        applicationStepTemplates: doc.applicationStepTemplates,
        customQuestions: normalizeCustomQuestions(doc.customQuestions),
        raRcNumber: doc.raRcNumber ?? null,
      },
    });
  } catch (error) {
    console.error("GET /api/jobs/[id]:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    await ensureIndexes();
    const hireAuth = await requireProfile("hire");
    if (!hireAuth.ok) {
      return NextResponse.json(
        { error: hireAuth.error },
        { status: hireAuth.status },
      );
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
    const {
      action,
      publish,
      applicationStepTemplates,
      customQuestions,
      ...fields
    } = parsed.data;
    const $set: Record<string, unknown> = { updatedAt: now };
    const $unset: Record<string, ""> = {
      // Drop removed job fields from older documents.
      ownerEmail: "",
      oneClickApply: "",
      hiredThisMonth: "",
    };

    for (const [key, value] of Object.entries(fields)) {
      if (
        value === null &&
        (key === "countryCode" || key === "stateCode" || key === "raRcNumber")
      ) {
        $unset[key] = "";
      } else if (value !== undefined && value !== null) {
        $set[key] = value;
      }
    }

    if (
      fields.payAmount !== undefined &&
      fields.payType !== undefined &&
      fields.payCurrency !== undefined
    ) {
      $set.pay = formatJobPay(
        fields.payAmount,
        fields.payCurrency,
        fields.payType,
      );
    }

    if (applicationStepTemplates !== undefined) {
      const templates = normalizeStepTemplates(applicationStepTemplates);
      $set.applicationStepTemplates = templates;
      if (!templates.some((s) => s.id === "custom-questions")) {
        $set.customQuestions = [];
      }
    }

    if (customQuestions !== undefined) {
      const templates =
        applicationStepTemplates !== undefined
          ? normalizeStepTemplates(applicationStepTemplates)
          : normalizeStepTemplates(existing.applicationStepTemplates);
      $set.customQuestions = templates.some((s) => s.id === "custom-questions")
        ? normalizeCustomQuestions(customQuestions)
        : [];
    }

    if (action === "publish" || publish === true) {
      // Recruiter submit → admin review queue (not live yet).
      $set.status = "underVerification";
      $set.publishedAt = null;
    } else if (action === "close") {
      $set.status = "closed";
    } else if (action === "reopen") {
      $set.status = "underVerification";
      $set.publishedAt = null;
    } else if (fields.status) {
      // Hirers cannot self-publish; coerce to review.
      if (fields.status === "published") {
        $set.status = "underVerification";
        $set.publishedAt = null;
      } else {
        $set.status = fields.status;
        if (
          fields.status === "draft" ||
          fields.status === "underVerification"
        ) {
          $set.publishedAt = null;
        }
      }
    }

    const updateDoc: {
      $set: Record<string, unknown>;
      $unset?: Record<string, "">;
    } = {
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
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
