import { type NextRequest, NextResponse } from "next/server";
import { requireProfile, rethrowIfPrerenderAbort } from "@/lib/auth/session";
import { completeMedicalAppointment } from "@/lib/medical/appointments";
import { handleMedicalRouteError } from "@/lib/medical/http";
import { completeMedicalSchema } from "@/lib/medical/types";
import { formatZodError } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireProfile("admin");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => null);
    const parsed = completeMedicalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }

    const appointment = await completeMedicalAppointment(parsed.data, {
      id: auth.user.id,
      email: auth.user.email,
    });
    return NextResponse.json({ appointment });
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    return handleMedicalRouteError(error, "POST /api/admin/medical/complete:");
  }
}
