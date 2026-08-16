import { NextRequest, NextResponse } from "next/server";
import {
  requireProfile,
  rethrowIfPrerenderAbort,
} from "@/lib/auth/session";
import { listHireOnboardings } from "@/lib/hire/onboarding";
import { HIRE_ONBOARDING_STATUSES } from "@/lib/hire/onboarding/types";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireProfile("admin");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const statusParam = req.nextUrl.searchParams.get("status")?.trim() || "submitted";
    const status =
      statusParam === "all" ||
      (HIRE_ONBOARDING_STATUSES as readonly string[]).includes(statusParam)
        ? (statusParam as "all" | (typeof HIRE_ONBOARDING_STATUSES)[number])
        : "submitted";

    const result = await listHireOnboardings({ status });
    return NextResponse.json(result);
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    console.error("GET /api/admin/hire-onboardings:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
