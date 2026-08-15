import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth/session";
import { getCandidateGateStatus } from "@/lib/candidate/queries";

/** Lightweight completeness check for proxy / client gates. */
export async function GET() {
  // Auth must stay outside try/catch so prerender aborts aren't logged as 500s.
  const auth = await requireProfile("work");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const { complete, kycVerified } = await getCandidateGateStatus(
      auth.user.id,
    );
    return NextResponse.json({ complete, kycVerified });
  } catch (error) {
    console.error("GET /api/candidate/onboarding-status:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
