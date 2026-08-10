import { NextResponse } from "next/server";

/** Hire company profile is set from the approved access request and is not editable. */
export async function PUT() {
  return NextResponse.json(
    {
      error:
        "Company profile is locked. It comes from your approved access request.",
    },
    { status: 403 },
  );
}
