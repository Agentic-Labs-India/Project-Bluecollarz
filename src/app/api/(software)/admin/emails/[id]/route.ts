import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  type AdminEmailDetail,
  asStringArray,
  getResendClient,
  mapReceivedListItem,
  mapSentListItem,
} from "@/lib/admin/resend";
import { requireProfile } from "@/lib/auth/session";
import { formatZodError } from "@/lib/utils";

const paramsSchema = z.object({
  id: z.string().trim().min(1),
});

const querySchema = z.object({
  box: z.enum(["sending", "receiving"]),
});

/** Retrieve a single sent or received email. Admin-only. */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireProfile("admin");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const rawParams = await ctx.params;
    const parsedParams = paramsSchema.safeParse(rawParams);
    const parsedQuery = querySchema.safeParse({
      box: req.nextUrl.searchParams.get("box"),
    });
    if (!parsedParams.success) {
      return NextResponse.json(
        { error: formatZodError(parsedParams.error) },
        { status: 400 },
      );
    }
    if (!parsedQuery.success) {
      return NextResponse.json(
        { error: formatZodError(parsedQuery.error) },
        { status: 400 },
      );
    }

    const resend = getResendClient();
    if (!resend) {
      return NextResponse.json(
        { error: "Resend is not configured" },
        { status: 503 },
      );
    }

    const { id } = parsedParams.data;
    const { box } = parsedQuery.data;

    if (box === "sending") {
      const { data, error } = await resend.emails.get(id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 502 });
      }
      if (!data) {
        return NextResponse.json({ error: "Email not found" }, { status: 404 });
      }
      const base = mapSentListItem(data);
      const detail: AdminEmailDetail = {
        ...base,
        html: data.html ?? null,
        text: data.text ?? null,
        cc: asStringArray(data.cc),
        bcc: asStringArray(data.bcc),
        replyTo: asStringArray(data.reply_to),
      };
      return NextResponse.json({ email: detail });
    }

    const { data, error } = await resend.emails.receiving.get(id, {
      html_format: "data_uri",
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    if (!data) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }
    const base = mapReceivedListItem(data);
    const detail: AdminEmailDetail = {
      ...base,
      html: data.html ?? null,
      text: data.text ?? null,
      cc: asStringArray(data.cc),
      bcc: asStringArray(data.bcc),
      replyTo: asStringArray(data.reply_to),
    };
    return NextResponse.json({ email: detail });
  } catch (error) {
    console.error("GET /api/admin/emails/[id]:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
