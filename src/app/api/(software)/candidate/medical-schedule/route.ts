import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCandidateAppReady } from "@/lib/auth/candidate-guard";
import { rethrowIfPrerenderAbort } from "@/lib/auth/session";
import { getCandidateScheduleContext } from "@/lib/medical/appointments";
import { handleMedicalRouteError } from "@/lib/medical/http";
import { formatZodError } from "@/lib/utils";

const querySchema = z.object({
  jobId: z.string().trim().min(1).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await requireCandidateAppReady();
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error, code: auth.code },
        { status: auth.status },
      );
    }

    const parsed = querySchema.safeParse(
      Object.fromEntries(req.nextUrl.searchParams.entries()),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }

    const context = await getCandidateScheduleContext(
      auth.user.id,
      parsed.data.jobId,
    );
    if (!context) {
      return NextResponse.json(
        { error: "No selected role to schedule" },
        { status: 404 },
      );
    }
    return NextResponse.json(context);
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    return handleMedicalRouteError(
      error,
      "GET /api/candidate/medical-schedule:",
    );
  }
}
