import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, rethrowIfPrerenderAbort } from "@/lib/auth/session";
import {
  CASE_STATES,
  listCases,
  toPublicCase,
} from "@/lib/legal-safety/serious-offence";
import { formatZodError } from "@/lib/utils";

const querySchema = z.object({
  state: z.enum(CASE_STATES).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await requireProfile("admin");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
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

    const items = (await listCases(parsed.data)).map(toPublicCase);
    return NextResponse.json({ items });
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    console.error("GET /api/admin/legal-safety/cases:", error);
    return NextResponse.json(
      { error: "Failed to load cases" },
      { status: 500 },
    );
  }
}
