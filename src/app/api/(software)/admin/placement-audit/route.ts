import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireProfile,
  rethrowIfPrerenderAbort,
} from "@/lib/auth/session";
import { ensureIndexes } from "@/lib/db/indexes";
import {
  appendPlacementAuditEvent,
  isPlacementAuditEnabled,
} from "@/lib/compliance/placement-audit";
import { formatZodError } from "@/lib/utils";

const bodySchema = z.object({
  kind: z.string().trim().min(2).max(80),
  jobId: z.string().trim().optional(),
  applicantId: z.string().trim().optional(),
  raRcNumber: z.string().trim().max(64).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Feature-flagged Model 2 placement audit stub.
 * Requires ENABLE_PLACEMENT_AUDIT=1 — not for live placements without counsel.
 */
export async function POST(req: NextRequest) {
  try {
    await ensureIndexes();
    if (!isPlacementAuditEnabled()) {
      return NextResponse.json(
        {
          error:
            "Placement audit is counsel-gated. Set ENABLE_PLACEMENT_AUDIT=1 to enable stubs.",
          enabled: false,
        },
        { status: 503 },
      );
    }

    const auth = await requireProfile("admin");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }

    const event = await appendPlacementAuditEvent(parsed.data);
    return NextResponse.json({
      enabled: true,
      event: event
        ? {
            eventId: event.eventId,
            kind: event.kind,
            raRcNumber: event.raRcNumber,
            createdAt: event.createdAt.toISOString(),
          }
        : null,
    });
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    console.error("POST /api/admin/placement-audit:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const auth = await requireProfile("admin");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    return NextResponse.json({
      enabled: isPlacementAuditEnabled(),
      note: "Model 2 RA RC binding stubs only — not live placement ops.",
    });
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
