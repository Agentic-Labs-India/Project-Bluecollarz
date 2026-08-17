import { NextResponse } from "next/server";
import { requireProfile, rethrowIfPrerenderAbort } from "@/lib/auth/session";
import { hasSeenNotice } from "@/lib/legal-safety/notices";
import { getOpenCaseForSubject } from "@/lib/legal-safety/serious-offence";

/** Worker-facing notice + case flags. Never includes indicators or excerpts. */
export async function GET() {
  try {
    const auth = await requireProfile("work");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const [open, pol0007Seen, pol0005Seen] = await Promise.all([
      getOpenCaseForSubject(auth.user.id),
      hasSeenNotice(auth.user.id, "POL-0007"),
      hasSeenNotice(auth.user.id, "POL-0005"),
    ]);

    return NextResponse.json({
      pol0007Required: !pol0007Seen,
      pol0005Required: Boolean(open) && !pol0005Seen,
      openCase: Boolean(open),
    });
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    console.error("GET /api/candidate/safety/status:", error);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
