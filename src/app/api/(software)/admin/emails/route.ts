import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sanitizeEmailComposeHtml } from "@/lib/admin/email-html";
import {
  formatSenderFrom,
  getResendClient,
  getResendFromEmail,
  mapReceivedListItem,
  mapSentListItem,
} from "@/lib/admin/resend";
import { requireProfile } from "@/lib/auth/session";
import { htmlToPlainText } from "@/lib/core/rich-text";
import { formatZodError } from "@/lib/utils";

const listSchema = z.object({
  box: z.enum(["sending", "receiving"]),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  after: z.string().trim().min(1).optional(),
  before: z.string().trim().min(1).optional(),
  days: z.coerce.number().int().positive().optional(),
  q: z.string().trim().max(200).optional(),
});

const sendSchema = z.object({
  to: z.array(z.string().trim().email()).min(1).max(50),
  subject: z.string().trim().min(1).max(500),
  html: z.string().trim().min(1),
  cc: z.array(z.string().trim().email()).max(50).optional(),
  bcc: z.array(z.string().trim().email()).max(50).optional(),
  replyTo: z.array(z.string().trim().email()).max(10).optional(),
});

/** List sent or received emails via Resend. Admin-only. */
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireProfile("admin");
    if (!authResult.ok) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status },
      );
    }

    const parsed = listSchema.safeParse({
      box: req.nextUrl.searchParams.get("box"),
      limit: req.nextUrl.searchParams.get("limit") ?? undefined,
      after: req.nextUrl.searchParams.get("after") ?? undefined,
      before: req.nextUrl.searchParams.get("before") ?? undefined,
      days: req.nextUrl.searchParams.get("days") ?? undefined,
      q: req.nextUrl.searchParams.get("q") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }

    const resend = getResendClient();
    if (!resend) {
      return NextResponse.json(
        {
          error:
            "Resend is not configured. Set RESEND_API_KEY (or RESEND_API) in env.",
          configured: false,
          items: [],
        },
        { status: 503 },
      );
    }

    const limit = parsed.data.limit ?? 10;
    const listOpts = parsed.data.after
      ? { limit, after: parsed.data.after }
      : parsed.data.before
        ? { limit, before: parsed.data.before }
        : { limit };

    const { data, error } =
      parsed.data.box === "sending"
        ? await resend.emails.list(listOpts)
        : await resend.emails.receiving.list(listOpts);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    const raw = data?.data ?? [];
    let items = raw.map((row) =>
      parsed.data.box === "sending"
        ? mapSentListItem(row)
        : mapReceivedListItem(row),
    );

    // Best-effort filters on the current Resend page (API has no date/q params).
    if (parsed.data.days) {
      const cutoff = Date.now() - parsed.data.days * 24 * 60 * 60 * 1000;
      items = items.filter((item) => {
        if (!item.createdAt) return false;
        const t = new Date(item.createdAt).getTime();
        return Number.isFinite(t) && t >= cutoff;
      });
    }

    if (parsed.data.q) {
      const needle = parsed.data.q.toLowerCase();
      items = items.filter((item) => {
        const hay = [
          item.subject,
          item.from,
          item.to.join(" "),
          item.lastEvent ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(needle);
      });
    }

    const lastId = raw.length ? raw[raw.length - 1]?.id : null;

    return NextResponse.json({
      configured: true,
      fromEmail: getResendFromEmail(),
      items,
      hasMore: Boolean(data?.has_more),
      nextCursor: lastId ?? null,
    });
  } catch (error) {
    console.error("GET /api/admin/emails:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

/** Send an email as the signed-in admin (name in From). Admin-only. */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireProfile("admin");
    if (!authResult.ok) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status },
      );
    }

    const resend = getResendClient();
    const fromEmail = getResendFromEmail();
    if (!resend || !fromEmail) {
      return NextResponse.json(
        {
          error:
            "Resend is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.",
        },
        { status: 503 },
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }

    const html = sanitizeEmailComposeHtml(parsed.data.html);
    if (!htmlToPlainText(html)) {
      return NextResponse.json(
        { error: "Email body cannot be empty" },
        { status: 400 },
      );
    }

    const from = formatSenderFrom(authResult.user.name, fromEmail);
    const replyTo = parsed.data.replyTo?.length
      ? parsed.data.replyTo
      : authResult.user.email
        ? [authResult.user.email]
        : undefined;

    const { data, error } = await resend.emails.send({
      from,
      to: parsed.data.to,
      subject: parsed.data.subject,
      html,
      text: htmlToPlainText(html),
      cc: parsed.data.cc?.length ? parsed.data.cc : undefined,
      bcc: parsed.data.bcc?.length ? parsed.data.bcc : undefined,
      replyTo,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    return NextResponse.json({ id: data?.id ?? null }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/emails:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
