import { NextResponse } from "next/server";
import {
  requireProfile,
  rethrowIfPrerenderAbort,
} from "@/lib/api/session";
import { listJobsUnderVerification } from "@/lib/admin/job-verification";
import { ensureIndexes } from "@/lib/db/indexes";

/** List jobs waiting for admin verification. */
export async function GET() {
  try {
    await ensureIndexes();
    const auth = await requireProfile("admin");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const items = await listJobsUnderVerification();
    return NextResponse.json({ items });
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    console.error("GET /api/admin/jobs:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
