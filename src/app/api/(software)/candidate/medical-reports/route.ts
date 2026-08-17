import { NextResponse } from "next/server";
import { requireCandidateAppReady } from "@/lib/auth/candidate-guard";
import { rethrowIfPrerenderAbort } from "@/lib/auth/session";
import { listCandidateMedicalReports } from "@/lib/medical/appointments";
import { handleMedicalRouteError } from "@/lib/medical/http";

export async function GET() {
  try {
    const auth = await requireCandidateAppReady();
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error, code: auth.code },
        { status: auth.status },
      );
    }

    const items = await listCandidateMedicalReports(auth.user.id);
    return NextResponse.json({ items });
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    return handleMedicalRouteError(
      error,
      "GET /api/candidate/medical-reports:",
    );
  }
}
