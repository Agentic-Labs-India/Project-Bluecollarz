import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCandidateAppReady } from "@/lib/auth/candidate-guard";
import { rethrowIfPrerenderAbort } from "@/lib/auth/session";
import {
  listCandidateMedicalAppointments,
  scheduleCandidateMedicalAppointment,
} from "@/lib/medical/appointments";
import { handleMedicalRouteError } from "@/lib/medical/http";
import { candidateScheduleSchema } from "@/lib/medical/types";
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

    const items = await listCandidateMedicalAppointments(
      auth.user.id,
      parsed.data.jobId,
    );
    return NextResponse.json({ items });
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    return handleMedicalRouteError(
      error,
      "GET /api/candidate/medical-appointments:",
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireCandidateAppReady();
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error, code: auth.code },
        { status: auth.status },
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = candidateScheduleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }

    const appointment = await scheduleCandidateMedicalAppointment(
      auth.user.id,
      parsed.data,
      { id: auth.user.id, email: auth.user.email },
    );
    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    return handleMedicalRouteError(
      error,
      "POST /api/candidate/medical-appointments:",
    );
  }
}
