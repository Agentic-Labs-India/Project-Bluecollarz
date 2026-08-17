import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, rethrowIfPrerenderAbort } from "@/lib/auth/session";
import {
  createMedicalCenter,
  deleteMedicalCenter,
  listMedicalCenters,
  updateMedicalCenter,
} from "@/lib/medical/centers";
import { handleMedicalRouteError } from "@/lib/medical/http";
import { medicalCenterInputSchema } from "@/lib/medical/types";
import { formatZodError } from "@/lib/utils";

const listQuerySchema = z.object({
  active: z.enum(["true", "false", "all"]).optional().default("all"),
});

const patchSchema = medicalCenterInputSchema.extend({
  id: z.string().trim().min(1),
});

const deleteSchema = z.object({
  id: z.string().trim().min(1),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await requireProfile("admin");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const parsed = listQuerySchema.safeParse(
      Object.fromEntries(req.nextUrl.searchParams.entries()),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }

    const active =
      parsed.data.active === "all" ? undefined : parsed.data.active === "true";
    const items = await listMedicalCenters({ active });
    return NextResponse.json({ items });
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    return handleMedicalRouteError(error, "GET /api/admin/medical/centers:");
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireProfile("admin");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => null);
    const parsed = medicalCenterInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }

    const center = await createMedicalCenter(parsed.data);
    return NextResponse.json({ center }, { status: 201 });
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    return handleMedicalRouteError(error, "POST /api/admin/medical/centers:");
  }
}

export async function PATCH(req: NextRequest) {
  try {
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

    const { id, ...rest } = parsed.data;
    const center = await updateMedicalCenter(id, rest);
    if (!center) {
      return NextResponse.json({ error: "Center not found" }, { status: 404 });
    }
    return NextResponse.json({ center });
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    return handleMedicalRouteError(error, "PATCH /api/admin/medical/centers:");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireProfile("admin");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => null);
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }

    const ok = await deleteMedicalCenter(parsed.data.id);
    if (!ok) {
      return NextResponse.json({ error: "Center not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    return handleMedicalRouteError(error, "DELETE /api/admin/medical/centers:");
  }
}
