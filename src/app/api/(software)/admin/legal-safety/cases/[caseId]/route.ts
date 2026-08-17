import { NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, rethrowIfPrerenderAbort } from "@/lib/auth/session";
import {
  releaseCaseHold,
  SeriousOffenceError,
  toPublicCase,
  transitionCase,
} from "@/lib/legal-safety/serious-offence";
import { formatZodError } from "@/lib/utils";

type RouteContext = { params: Promise<{ caseId: string }> };

/**
 * `legal_review_required` is absent on purpose. Only the detector opens a
 * case, and a reviewer cannot return one to a machine-authored state.
 */
const patchSchema = z
  .object({
    to: z
      .enum(["no_statutory_trigger", "mandatory_report_triggered"])
      .optional(),
    releaseHold: z.boolean().optional(),
    note: z.string().trim().min(10).max(4000),
  })
  .refine((data) => Boolean(data.to) || data.releaseHold === true, {
    message: "Choose an outcome or release the hold.",
  });

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await requireProfile("admin");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }

    const { caseId } = await context.params;
    const actor = { id: auth.user.id, email: auth.user.email };

    if (parsed.data.releaseHold && !parsed.data.to) {
      const updated = await releaseCaseHold({
        caseId,
        note: parsed.data.note,
        actor,
      });
      return NextResponse.json({ case: toPublicCase(updated) });
    }

    const updated = await transitionCase({
      caseId,
      to: parsed.data.to!,
      note: parsed.data.note,
      actor,
    });

    return NextResponse.json({ case: toPublicCase(updated) });
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    if (error instanceof SeriousOffenceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    console.error("PATCH /api/admin/legal-safety/cases/[caseId]:", error);
    return NextResponse.json(
      { error: "Failed to update case" },
      { status: 500 },
    );
  }
}
