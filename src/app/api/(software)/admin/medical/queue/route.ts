import { type NextRequest, NextResponse } from "next/server";
import { requireProfile, rethrowIfPrerenderAbort } from "@/lib/auth/session";
import { listSelectedMedicalQueue } from "@/lib/medical/appointments";
import { handleMedicalRouteError } from "@/lib/medical/http";
import { medicalQueueQuerySchema } from "@/lib/medical/types";
import { formatZodError } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireProfile("admin");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const parsed = medicalQueueQuerySchema.safeParse(
      Object.fromEntries(req.nextUrl.searchParams.entries()),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }

    const items = await listSelectedMedicalQueue(parsed.data);
    return NextResponse.json({ items });
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    return handleMedicalRouteError(error, "GET /api/admin/medical/queue:");
  }
}
