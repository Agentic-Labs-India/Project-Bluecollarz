import { NextRequest, NextResponse } from "next/server";
import {
  requireProfile,
  rethrowIfPrerenderAbort,
} from "@/lib/auth/session";
import { listRecruiterInquiries } from "@/lib/hire/inquiries";
import { RECRUITER_INQUIRY_STATUSES } from "@/lib/hire/inquiries/types";

/** Admin inbox for recruiter access requests. */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireProfile("admin");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const statusParam = req.nextUrl.searchParams.get("status")?.trim() || "all";
    const status =
      statusParam === "all" ||
      (RECRUITER_INQUIRY_STATUSES as readonly string[]).includes(statusParam)
        ? (statusParam as "all" | (typeof RECRUITER_INQUIRY_STATUSES)[number])
        : "all";

    const result = await listRecruiterInquiries({ status });
    return NextResponse.json(result);
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    console.error("GET /api/admin/recruiter-inquiries:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
