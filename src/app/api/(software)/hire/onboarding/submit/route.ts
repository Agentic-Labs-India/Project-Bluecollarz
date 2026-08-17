import { NextResponse } from "next/server";
import { requireProfile, rethrowIfPrerenderAbort } from "@/lib/auth/session";
import { submitHireOnboarding } from "@/lib/hire/onboarding";

export async function POST() {
  try {
    const auth = await requireProfile("hire");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    try {
      const item = await submitHireOnboarding(auth.user.id);
      return NextResponse.json({ item });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not submit onboarding";
      if (message.includes("locked") || message.includes("Complete required")) {
        return NextResponse.json({ error: message }, { status: 409 });
      }
      throw error;
    }
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    console.error("POST /api/hire/onboarding/submit:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
