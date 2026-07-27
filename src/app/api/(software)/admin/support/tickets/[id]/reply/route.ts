import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile } from "@/lib/api/session";
import { sanitizeEmailComposeHtml } from "@/lib/admin/email-html";
import {
  formatSenderFrom,
  getResendClient,
  getResendFromEmail,
} from "@/lib/admin/resend";
import { htmlToPlainText } from "@/lib/rich-text";
import {
  assignSupportTicket,
  getSupportTicket,
} from "@/lib/support/tickets";
import { formatZodError } from "@/lib/utils";

const paramsSchema = z.object({
  id: z.string().trim().min(1),
});

const bodySchema = z.object({
  message: z.string().trim().min(1).max(20000),
});

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildReplyHtml(input: {
  message: string;
  summary: string;
  problemType: string;
  ticketId: string;
}): string {
  const paragraphs = input.message
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(
      (block) =>
        `<p>${escapeHtml(block).replace(/\n/g, "<br />")}</p>`,
    )
    .join("");

  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.55; color: #171717;">
      ${paragraphs}
      <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
      <p style="font-size: 12px; color: #737373; margin: 0 0 8px;">
        Regarding your Blucollarz support request
      </p>
      <p style="font-size: 13px; color: #525252; margin: 0 0 4px;">
        <strong>Issue:</strong> ${escapeHtml(input.problemType)}
      </p>
      <p style="font-size: 13px; color: #525252; margin: 0 0 4px;">
        <strong>Summary:</strong> ${escapeHtml(input.summary)}
      </p>
      <p style="font-size: 12px; color: #a3a3a3; margin: 12px 0 0; font-family: ui-monospace, monospace;">
        Ticket ${escapeHtml(input.ticketId)}
      </p>
    </div>
  `.trim();
}

/**
 * Reply to the ticket filer by email, then assign the ticket to the sending admin.
 * If another admin already owns the ticket, returns 409 without sending.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireProfile("admin");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const params = paramsSchema.safeParse(await ctx.params);
    if (!params.success) {
      return NextResponse.json(
        { error: formatZodError(params.error) },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }

    const ticket = await getSupportTicket(params.data.id);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const assignee = {
      id: auth.user.id,
      name: auth.user.name?.trim() || auth.user.email,
      email: auth.user.email,
    };

    // Claim first so two admins can't both send on a race.
    const claim = await assignSupportTicket({
      id: ticket.id,
      assignee,
    });
    if (!claim.ok) {
      if (claim.reason === "already_assigned" && claim.assignee) {
        return NextResponse.json(
          {
            error: "already_assigned",
            message: `Already assigned to ${claim.assignee.name} (${claim.assignee.email})`,
            assignee: claim.assignee,
          },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
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

    const html = sanitizeEmailComposeHtml(
      buildReplyHtml({
        message: parsed.data.message,
        summary: ticket.summary,
        problemType: ticket.problemType.replace(/_/g, " "),
        ticketId: ticket.id,
      }),
    );
    if (!htmlToPlainText(html)) {
      return NextResponse.json(
        { error: "Email body cannot be empty" },
        { status: 400 },
      );
    }

    const subject = `Re: Blucollarz support — ${ticket.summary.slice(0, 80)}`;
    const from = formatSenderFrom(assignee.name, fromEmail);

    const { data, error } = await resend.emails.send({
      from,
      to: [ticket.email],
      subject,
      html,
      text: htmlToPlainText(html),
      replyTo: [assignee.email],
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    return NextResponse.json({
      item: claim.item,
      emailId: data?.id ?? null,
    });
  } catch (error) {
    console.error("POST /api/admin/support/tickets/[id]/reply:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
