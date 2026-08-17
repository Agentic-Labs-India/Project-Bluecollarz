import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { deleteUserProvision } from "@/lib/admin/provisions";
import {
  listUsersByProfileType,
  setUserProfileType,
  upsertUserProfileTypeByEmail,
} from "@/lib/admin/queries";
import { requireProfile } from "@/lib/auth/session";
import { formatZodError } from "@/lib/utils";

const provisionSchema = z.object({
  email: z.string().trim().email("Valid email required"),
  profileType: z.enum(["hire", "admin"]),
});

const updateSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("user"),
    userId: z.string().trim().min(1),
    profileType: z.literal("work"),
  }),
  z.object({
    kind: z.literal("pending"),
    email: z.string().trim().email(),
    profileType: z.literal("work"),
  }),
]);

/** List provisioned hire or admin users. Admin-only. */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireProfile("admin");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const type = req.nextUrl.searchParams.get("type")?.trim();
    if (type !== "hire" && type !== "admin") {
      return NextResponse.json(
        { error: "type must be hire or admin" },
        { status: 400 },
      );
    }

    const items = await listUsersByProfileType(type);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("GET /api/admin/users:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

/** Create or promote a user to hire/admin by email. Admin-only. */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireProfile("admin");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => null);
    const parsed = provisionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }

    const email = parsed.data.email.trim().toLowerCase();
    if (email === auth.user.email) {
      return NextResponse.json(
        { error: "You cannot change your own role this way" },
        { status: 400 },
      );
    }

    const result = await upsertUserProfileTypeByEmail(
      email,
      parsed.data.profileType,
    );
    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (error) {
    console.error("POST /api/admin/users:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

/** Change role or cancel a pending invite. Admin-only. */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireProfile("admin");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }

    if (parsed.data.kind === "pending") {
      const removed = await deleteUserProvision(parsed.data.email);
      if (!removed) {
        return NextResponse.json(
          { error: "Invite not found" },
          { status: 404 },
        );
      }
      return NextResponse.json({ ok: true });
    }

    if (parsed.data.userId === auth.user.id) {
      return NextResponse.json(
        { error: "You cannot change your own role" },
        { status: 400 },
      );
    }

    const item = await setUserProfileType(
      parsed.data.userId,
      parsed.data.profileType,
    );
    if (!item) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error("PATCH /api/admin/users:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
