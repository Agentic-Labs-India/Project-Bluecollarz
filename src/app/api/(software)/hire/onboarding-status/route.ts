import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth/session";
import { getHireOnboardingStatus } from "@/lib/hire/onboarding";
import { isHireOnboardingVerified } from "@/lib/hire/onboarding/types";

/** Lightweight completeness check for proxy / client gates. */
export async function GET() {
  const auth = await requireProfile("hire");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const status = await getHireOnboardingStatus(auth.user.id);
    return NextResponse.json({
      complete: isHireOnboardingVerified(status),
      status,
    });
  } catch (error) {
    console.error("GET /api/hire/onboarding-status:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
