import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile } from "@/lib/api/session";
import { PROFILE_TYPES } from "@/lib/profile-types";
import {
  listSupportTickets,
  updateSupportTicketStatus,
} from "@/lib/support/tickets";
import {
  SUPPORT_PRIORITIES,
  SUPPORT_SERIOUSNESS,
  SUPPORT_STATUSES,
} from "@/lib/support/types";
import { formatZodError } from "@/lib/utils";

const listQuerySchema = z.object({
  status: z.enum(SUPPORT_STATUSES).optional(),
  profileType: z.enum(PROFILE_TYPES).optional(),
  priority: z.enum(SUPPORT_PRIORITIES).optional(),
  seriousness: z.enum(SUPPORT_SERIOUSNESS).optional(),
});

/** List support tickets. Admin-only. */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireProfile("admin");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const raw = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = listQuerySchema.safeParse({
      status: raw.status || undefined,
      profileType: raw.profileType || undefined,
      priority: raw.priority || undefined,
      seriousness: raw.seriousness || undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }

    const result = await listSupportTickets({
      ...parsed.data,
      limit: 80,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/admin/support/tickets:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

const patchSchema = z.object({
  id: z.string().trim().min(1),
  status: z.enum(SUPPORT_STATUSES),
});

/** Update ticket status. Admin-only. */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireProfile("admin");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }

    const item = await updateSupportTicketStatus(
      parsed.data.id,
      parsed.data.status,
    );
    if (!item) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error("PATCH /api/admin/support/tickets:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
