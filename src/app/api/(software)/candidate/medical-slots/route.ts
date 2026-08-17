import { type NextRequest, NextResponse } from "next/server";
import { requireCandidateAppReady } from "@/lib/auth/candidate-guard";
import { rethrowIfPrerenderAbort } from "@/lib/auth/session";
import { listAvailableSlotTimes } from "@/lib/medical/appointments";
import { handleMedicalRouteError } from "@/lib/medical/http";
import { candidateSlotsQuerySchema } from "@/lib/medical/types";
import { formatZodError } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireCandidateAppReady();
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error, code: auth.code },
        { status: auth.status },
      );
    }

    const parsed = candidateSlotsQuerySchema.safeParse(
      Object.fromEntries(req.nextUrl.searchParams.entries()),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }

    const slots = await listAvailableSlotTimes({
      centerId: parsed.data.centerId,
      date: parsed.data.date,
      excludeApplicantId: auth.user.id,
      excludeJobId: parsed.data.jobId,
    });
    return NextResponse.json({ slots });
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    return handleMedicalRouteError(error, "GET /api/candidate/medical-slots:");
  }
}
