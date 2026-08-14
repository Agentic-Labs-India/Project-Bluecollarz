import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireProfile,
  rethrowIfPrerenderAbort,
} from "@/lib/api/session";
import { ensureIndexes } from "@/lib/db/indexes";
import {
  listRightsRequestsAdmin,
  RIGHTS_REQUEST_STATUSES,
  serializeRightsRequest,
  updateRightsRequest,
} from "@/lib/compliance/rights";
import { formatZodError } from "@/lib/utils";

const patchSchema = z.object({
  requestId: z.string().min(8),
  status: z.enum(RIGHTS_REQUEST_STATUSES),
  adminNotes: z.string().trim().max(4000).optional(),
});

/** Admin queue for Data Principal rights requests. */
export async function GET(req: NextRequest) {
  try {
    await ensureIndexes();
    const auth = await requireProfile("admin");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const statusParam = req.nextUrl.searchParams.get("status")?.trim();
    const status =
      statusParam &&
      (RIGHTS_REQUEST_STATUSES as readonly string[]).includes(statusParam)
        ? (statusParam as (typeof RIGHTS_REQUEST_STATUSES)[number])
        : undefined;

    const items = await listRightsRequestsAdmin(status);
    return NextResponse.json({
      items: items.map((item) =>
        serializeRightsRequest(item, { includeAdminNotes: true }),
      ),
    });
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    console.error("GET /api/admin/rights:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await ensureIndexes();
    const auth = await requireProfile("admin");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }

    const item = await updateRightsRequest(parsed.data);
    if (!item) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    return NextResponse.json({
      item: serializeRightsRequest(item, { includeAdminNotes: true }),
    });
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    console.error("PATCH /api/admin/rights:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
