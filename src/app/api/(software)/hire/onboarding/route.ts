import { NextRequest, NextResponse } from "next/server";
import {
  requireProfile,
  rethrowIfPrerenderAbort,
} from "@/lib/auth/session";
import {
  getOrCreateHireOnboarding,
  saveHireOnboarding,
} from "@/lib/hire/onboarding";
import { hireOnboardingSaveSchema } from "@/lib/hire/onboarding/types";
import { formatZodError } from "@/lib/utils";

export async function GET() {
  try {
    const auth = await requireProfile("hire");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const item = await getOrCreateHireOnboarding(auth.user.id);
    return NextResponse.json({ item });
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    console.error("GET /api/hire/onboarding:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireProfile("hire");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => null);
    const parsed = hireOnboardingSaveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }

    try {
      const item = await saveHireOnboarding({
        userId: auth.user.id,
        payload: parsed.data,
      });
      return NextResponse.json({ item });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not save onboarding";
      if (
        message.includes("locked") ||
        message.includes("Document") ||
        message.includes("folder")
      ) {
        return NextResponse.json({ error: message }, { status: 409 });
      }
      throw error;
    }
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    console.error("PATCH /api/hire/onboarding:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
