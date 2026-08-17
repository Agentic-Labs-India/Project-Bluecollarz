import { type NextRequest, NextResponse } from "next/server";
import { resolveCountryName } from "@/lib/core/geo/places";
import { ensureIndexes } from "@/lib/db/indexes";
import { createRecruiterInquiry } from "@/lib/hire/inquiries";
import { recruiterInquiryCreateSchema } from "@/lib/hire/inquiries/types";
import { formatZodError } from "@/lib/utils";

/** Public recruiter access request — no auth. */
export async function POST(req: NextRequest) {
  try {
    await ensureIndexes();
    const body = await req.json().catch(() => null);
    const parsed = recruiterInquiryCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }

    const country = resolveCountryName(parsed.data.country);
    if (!country) {
      return NextResponse.json(
        { error: "Select a valid country from the list" },
        { status: 400 },
      );
    }

    const item = await createRecruiterInquiry({
      ...parsed.data,
      country,
    });
    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (error) {
    console.error("POST /api/recruiter-inquiries:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
