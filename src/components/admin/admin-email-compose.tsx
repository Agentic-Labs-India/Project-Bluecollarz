"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { EmailRichTextEditor } from "@/components/admin/email-rich-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { htmlToPlainText } from "@/lib/rich-text";

function parseAddressList(raw: string): string[] {
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export type EmailComposeDraft = {
  to?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  html?: string;
};

export function AdminEmailCompose({
  open,
  onOpenChange,
  senderLabel,
  draft,
  onSent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  senderLabel: string;
  draft?: EmailComposeDraft | null;
  onSent: () => void;
}) {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTo(draft?.to ?? "");
    setCc(draft?.cc ?? "");
    setBcc(draft?.bcc ?? "");
    setSubject(draft?.subject ?? "");
    setHtml(draft?.html ?? "");
    setShowCc(Boolean(draft?.cc));
    setShowBcc(Boolean(draft?.bcc));
  }, [open, draft]);

  const canSend = useMemo(() => {
    return (
      parseAddressList(to).length > 0 &&
      subject.trim().length > 0 &&
      htmlToPlainText(html).length > 0
    );
  }, [to, subject, html]);

  function reset() {
    setTo("");
    setCc("");
    setBcc("");
    setSubject("");
    setHtml("");
    setShowCc(false);
    setShowBcc(false);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: parseAddressList(to),
          cc: (() => {
            const list = showCc ? parseAddressList(cc) : [];
            return list.length ? list : undefined;
          })(),
          bcc: (() => {
            const list = showBcc ? parseAddressList(bcc) : [];
            return list.length ? list : undefined;
          })(),
          subject: subject.trim(),
          html,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(json.error || "Could not send email");
        return;
      }
      toast.success("Email sent");
      reset();
      onOpenChange(false);
      onSent();
    } catch {
      toast.error("Could not send email");
    } finally {
      setSending(false);
    }
  }

  const isReply = Boolean(draft?.to);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 sm:max-w-4xl!"
      >
        <SheetHeader className="border-border border-b pb-4">
          <SheetTitle>{isReply ? "Reply" : "New message"}</SheetTitle>
          <SheetDescription>
            Sends as <span className="text-foreground">{senderLabel}</span>.
            Replies go to your signed-in email.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={(e) => void handleSend(e)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="email-to">To</Label>
                <div className="flex items-center gap-1.5">
                  {!showCc ? (
                    <Button
                      type="button"
                      size="xs"
                      onClick={() => setShowCc(true)}
                      disabled={sending}
                    >
                      Cc
                    </Button>
                  ) : null}
                  {!showBcc ? (
                    <Button
                      type="button"
                      size="xs"
                      onClick={() => setShowBcc(true)}
                      disabled={sending}
                    >
                      Bcc
                    </Button>
                  ) : null}
                </div>
              </div>
              <Input
                id="email-to"
                type="text"
                autoComplete="email"
                placeholder="name@company.com"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                disabled={sending}
                required
              />
            </div>

            {showCc ? (
              <div className="grid gap-1.5">
                <Label htmlFor="email-cc">Cc</Label>
                <Input
                  id="email-cc"
                  type="text"
                  placeholder="cc@company.com"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  disabled={sending}
                />
              </div>
            ) : null}

            {showBcc ? (
              <div className="grid gap-1.5">
                <Label htmlFor="email-bcc">Bcc</Label>
                <Input
                  id="email-bcc"
                  type="text"
                  placeholder="bcc@company.com"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  disabled={sending}
                />
              </div>
            ) : null}

            <div className="grid gap-1.5">
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={sending}
                required
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Message</Label>
              <EmailRichTextEditor
                value={html}
                onChange={setHtml}
                placeholder="Write like you would in Gmail — format text and drop images in…"
              />
            </div>
          </div>

          <SheetFooter className="border-border border-t pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={sending}
              onClick={() => onOpenChange(false)}
            >
              Discard
            </Button>
            <Button type="submit" disabled={sending || !canSend}>
              {sending ? "Sending…" : "Send"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
