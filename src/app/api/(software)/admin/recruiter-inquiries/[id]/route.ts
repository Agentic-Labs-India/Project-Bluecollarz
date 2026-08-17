import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile } from "@/lib/auth/session";
import { reviewRecruiterInquiry } from "@/lib/hire/inquiries";
import { formatZodError } from "@/lib/utils";

type RouteContext = { params: Promise<{ id: string }> };

const reviewSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  adminNote: z.string().trim().max(2000).optional(),
});

/** Approve (provision hire) or reject a recruiter inquiry. */
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const auth = await requireProfile("admin");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    if (!auth.user.id || !auth.user.email) {
      return NextResponse.json({ error: "Invalid admin" }, { status: 400 });
    }

    const { id } = await context.params;
    const body = await req.json().catch(() => null);
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }

    try {
      const item = await reviewRecruiterInquiry({
        id,
        status: parsed.data.status,
        adminNote: parsed.data.adminNote,
        reviewer: {
          id: auth.user.id,
          email: auth.user.email,
          name: auth.user.name,
        },
      });
      if (!item) {
        return NextResponse.json(
          { error: "Inquiry not found" },
          { status: 404 },
        );
      }
      return NextResponse.json({ item });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not update inquiry";
      if (message.startsWith("Inquiry is already")) {
        return NextResponse.json({ error: message }, { status: 409 });
      }
      throw error;
    }
  } catch (error) {
    console.error("PATCH /api/admin/recruiter-inquiries/[id]:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
