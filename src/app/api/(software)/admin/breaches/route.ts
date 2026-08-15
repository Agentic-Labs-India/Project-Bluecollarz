import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireProfile,
  rethrowIfPrerenderAbort,
} from "@/lib/auth/session";
import {
  BREACH_STATUSES,
  createBreachIncident,
  listBreachIncidents,
  serializeBreach,
  updateBreachIncident,
} from "@/lib/compliance/breach";
import { ensureIndexes } from "@/lib/db/indexes";
import { formatZodError } from "@/lib/utils";

const createSchema = z.object({
  title: z.string().trim().min(3).max(200),
  summary: z.string().trim().min(10).max(5000),
  affectedPrincipalIds: z.array(z.string()).max(5000).optional(),
  notifyBoard: z.boolean().optional(),
  notifyPrincipals: z.boolean().optional(),
});

const patchSchema = z.object({
  incidentId: z.string().min(8),
  status: z.enum(BREACH_STATUSES),
  markBoardNotified: z.boolean().optional(),
  markPrincipalsNotified: z.boolean().optional(),
});

/** Admin breach register — DPDP Board / principal notification workflow. */
export async function GET() {
  try {
    await ensureIndexes();
    const auth = await requireProfile("admin");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const items = await listBreachIncidents();
    return NextResponse.json({
      items: await Promise.all(items.map(serializeBreach)),
    });
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    console.error("GET /api/admin/breaches:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureIndexes();
    const auth = await requireProfile("admin");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }
    const item = await createBreachIncident({
      ...parsed.data,
      createdBy: auth.user.id,
    });
    return NextResponse.json({ item: await serializeBreach(item) });
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    console.error("POST /api/admin/breaches:", error);
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
    const item = await updateBreachIncident(parsed.data);
    if (!item) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }
    return NextResponse.json({ item: await serializeBreach(item) });
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    console.error("PATCH /api/admin/breaches:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
