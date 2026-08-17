import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  approveJobVerification,
  denyJobVerification,
  getJobUnderVerification,
} from "@/lib/admin/job-verification";
import { requireProfile, rethrowIfPrerenderAbort } from "@/lib/auth/session";
import { ensureIndexes } from "@/lib/db/indexes";
import { formatZodError } from "@/lib/utils";

type RouteContext = { params: Promise<{ id: string }> };

const reviewSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve"),
    raRcNumber: z.preprocess((val) => {
      if (typeof val !== "string") return undefined;
      const s = val.trim();
      return s.length ? s : undefined;
    }, z.string().max(64).optional()),
  }),
  z.object({
    action: z.literal("deny"),
    reason: z
      .string()
      .trim()
      .min(3, "Please provide a denial reason")
      .max(2000),
  }),
]);

/** Full job detail for the verification sheet. */
export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    await ensureIndexes();
    const auth = await requireProfile("admin");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await context.params;
    const item = await getJobUnderVerification(id);
    if (!item) {
      return NextResponse.json(
        { error: "Job not found or not awaiting verification" },
        { status: 404 },
      );
    }
    return NextResponse.json({ item });
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    console.error("GET /api/admin/jobs/[id]:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

/** Accept (publish + email) or decline (draft + email). */
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    await ensureIndexes();
    const auth = await requireProfile("admin");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await context.params;
    const body = await req.json().catch(() => null);
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }

    try {
      if (parsed.data.action === "approve") {
        const item = await approveJobVerification({
          id,
          reviewerName: auth.user.name,
          raRcNumber: parsed.data.raRcNumber,
        });
        return NextResponse.json({ item });
      }

      const item = await denyJobVerification({
        id,
        reason: parsed.data.reason,
        reviewerName: auth.user.name,
      });
      return NextResponse.json({ item });
    } catch (error) {
      rethrowIfPrerenderAbort(error);
      const message =
        error instanceof Error ? error.message : "Could not update job";
      const status =
        message.includes("not found") || message.includes("Invalid job")
          ? 404
          : message.includes("not configured") ||
              message.includes("email not found")
            ? 503
            : 400;
      return NextResponse.json({ error: message }, { status });
    }
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    console.error("PATCH /api/admin/jobs/[id]:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
