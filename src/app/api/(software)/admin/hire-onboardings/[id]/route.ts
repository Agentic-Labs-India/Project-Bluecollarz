import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile } from "@/lib/auth/session";
import { reviewHireOnboarding } from "@/lib/hire/onboarding";
import { formatZodError } from "@/lib/utils";

type RouteContext = { params: Promise<{ id: string }> };

const reviewSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("verified"),
    adminNote: z.string().trim().max(2000).optional(),
  }),
  z.object({
    status: z.literal("rejected"),
    adminNote: z
      .string()
      .trim()
      .min(8, "Describe the changes required")
      .max(2000),
  }),
]);

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
      const item = await reviewHireOnboarding({
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
          { error: "Onboarding not found" },
          { status: 404 },
        );
      }
      return NextResponse.json({ item });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not update onboarding";
      if (
        message.startsWith("Onboarding is already") ||
        message.includes("changes required")
      ) {
        return NextResponse.json({ error: message }, { status: 409 });
      }
      throw error;
    }
  } catch (error) {
    console.error("PATCH /api/admin/hire-onboardings/[id]:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
