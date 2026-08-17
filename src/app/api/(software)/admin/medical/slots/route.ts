import { type NextRequest, NextResponse } from "next/server";
import { requireProfile, rethrowIfPrerenderAbort } from "@/lib/auth/session";
import { listTakenSlotTimes } from "@/lib/medical/appointments";
import { handleMedicalRouteError } from "@/lib/medical/http";
import { adminSlotsQuerySchema } from "@/lib/medical/types";
import { formatZodError } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireProfile("admin");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const parsed = adminSlotsQuerySchema.safeParse(
      Object.fromEntries(req.nextUrl.searchParams.entries()),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }

    const taken = await listTakenSlotTimes({
      centerId: parsed.data.centerId,
      date: parsed.data.date,
      excludeAppointmentId: parsed.data.excludeAppointmentId,
    });
    return NextResponse.json({ taken });
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    return handleMedicalRouteError(error, "GET /api/admin/medical/slots:");
  }
}
