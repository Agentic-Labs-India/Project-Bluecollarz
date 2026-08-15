"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import { MailIcon, PenSquareIcon, ReplyIcon } from "lucide-react";
import { toast } from "sonner";
import {
  AdminEmailCompose,
  type EmailComposeDraft,
} from "@/components/admin/admin-email-compose";
import {
  AdminHubHeader,
  AdminPageTabs,
} from "@/components/admin/admin-page-tabs";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  extractEmailAddress,
  sanitizeEmailViewHtml,
} from "@/lib/admin/email-html";
import type {
  AdminEmailDetail,
  AdminEmailListItem,
} from "@/lib/admin/resend";
import { authClient } from "@/lib/auth/auth-client";
import { formatDateTimeShort } from "@/lib/core/dates";

type Box = "sending" | "receiving";
type DaysFilter = "7" | "15" | "30" | "90" | "all";

const BOX_TABS = [
  { value: "sending", label: "Sending" },
  { value: "receiving", label: "Receiving" },
] as const;

const PAGE_SIZE = 10;

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  return formatDateTimeShort(iso);
}

function replySubject(subject: string) {
  const trimmed = subject.trim();
  if (/^re:\s+/i.test(trimmed)) return trimmed;
  return `Re: ${trimmed || "(no subject)"}`;
}

function buildReplyHtml(detail: AdminEmailDetail) {
  const when = detail.createdAt
    ? new Date(detail.createdAt).toLocaleString()
    : "";
  const fromSafe = detail.from
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const quoted =
    detail.html?.trim() ||
    (detail.text
      ? `<p>${detail.text
          .split("\n")
          .map((line) =>
            line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"),
          )
          .join("<br/>")}</p>`
      : "<p></p>");

  return `<p></p><p></p><blockquote><p>On ${when}, ${fromSafe} wrote:</p>${quoted}</blockquote>`;
}

export function AdminEmailInbox() {
  const { data: session } = authClient.useSession();
  const user = session?.user as
    | { name?: string | null; email?: string | null }
    | undefined;

  const senderName = user?.name?.trim() || "Blucollarz";
  const [box, setBox] = useState<Box>("receiving");
  const [days, setDays] = useState<DaysFilter>("15");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");

  const [items, setItems] = useState<AdminEmailListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [fromEmail, setFromEmail] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const cursorStackRef = useRef<(string | undefined)[]>([undefined]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminEmailDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [composeOpen, setComposeOpen] = useState(false);
  const [composeDraft, setComposeDraft] = useState<EmailComposeDraft | null>(
    null,
  );
  const [reloadToken, setReloadToken] = useState(0);

  const senderLabel = fromEmail
    ? `${senderName} <${fromEmail}>`
    : senderName;

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const filtersKey = `${box}|${days}|${searchDebounced}|${reloadToken}`;
  const filtersKeyRef = useRef(filtersKey);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (filtersKeyRef.current !== filtersKey) {
        filtersKeyRef.current = filtersKey;
        cursorStackRef.current = [undefined];
        if (pagination.pageIndex !== 0) {
          setPagination((p) => ({ ...p, pageIndex: 0 }));
          return;
        }
      }

      setLoading(true);
      setConfigError(null);
      try {
        const after = cursorStackRef.current[pagination.pageIndex];
        const params = new URLSearchParams({
          box,
          limit: String(PAGE_SIZE),
        });
        if (after) params.set("after", after);
        if (days !== "all") params.set("days", days);
        if (searchDebounced) params.set("q", searchDebounced);

        const res = await fetch(`/api/admin/emails?${params.toString()}`);
        const json = (await res.json().catch(() => ({}))) as {
          items?: AdminEmailListItem[];
          error?: string;
          configured?: boolean;
          fromEmail?: string | null;
          hasMore?: boolean;
          nextCursor?: string | null;
        };

        if (cancelled) return;

        if (res.status === 503) {
          setConfigured(false);
          setFromEmail(null);
          setConfigError(
            json.error || "Add RESEND_API_KEY and RESEND_FROM_EMAIL to env.",
          );
          setItems([]);
          setHasMore(false);
          return;
        }

        setConfigured(true);
        setFromEmail(json.fromEmail ?? null);

        if (!res.ok) {
          toast.error(json.error || "Could not load emails");
          setItems([]);
          setHasMore(false);
          return;
        }

        setItems(json.items ?? []);
        setHasMore(Boolean(json.hasMore));

        if (json.nextCursor) {
          cursorStackRef.current[pagination.pageIndex + 1] = json.nextCursor;
        }
      } catch {
        if (!cancelled) toast.error("Could not load emails");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [filtersKey, box, days, searchDebounced, pagination.pageIndex]);

  const pageCount = Math.max(
    1,
    pagination.pageIndex + 1 + (hasMore ? 1 : 0),
  );

  const detailReqRef = useRef(0);

  async function openEmail(item: AdminEmailListItem) {
    const reqId = ++detailReqRef.current;
    setSelectedId(item.id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/emails/${item.id}?box=${box}`);
      const json = (await res.json().catch(() => ({}))) as {
        email?: AdminEmailDetail;
        error?: string;
      };
      if (reqId !== detailReqRef.current) return;
      if (!res.ok || !json.email) {
        toast.error(json.error || "Could not open email");
        return;
      }
      setDetail(json.email);
    } catch {
      if (reqId !== detailReqRef.current) return;
      toast.error("Could not open email");
    } finally {
      if (reqId === detailReqRef.current) setDetailLoading(false);
    }
  }

  function startCompose(draft?: EmailComposeDraft | null) {
    setComposeDraft(draft ?? null);
    setComposeOpen(true);
  }

  function startReply(email: AdminEmailDetail) {
    const to = extractEmailAddress(email.from);
    startCompose({
      to,
      subject: replySubject(email.subject),
      html: buildReplyHtml(email),
    });
    setSelectedId(null);
    setDetail(null);
  }

  const columns: ColumnDef<AdminEmailListItem>[] = useMemo(
    () => [
      {
        id: "from",
        accessorKey: "from",
        header: "From",
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-3">
            <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center">
              <MailIcon className="size-3.5" strokeWidth={2} />
            </span>
            <span className="text-foreground truncate text-sm underline decoration-dotted decoration-muted-foreground/60 underline-offset-4">
              {row.original.from || "—"}
            </span>
          </div>
        ),
      },
      {
        id: "to",
        accessorFn: (row) => row.to.join(", "),
        header: "To",
        cell: ({ row }) => (
          <span className="text-muted-foreground truncate text-sm">
            {row.original.to.join(", ") || "—"}
          </span>
        ),
      },
      {
        id: "subject",
        accessorKey: "subject",
        header: "Subject",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-foreground truncate text-sm">
              {row.original.subject}
            </p>
            <p className="text-muted-foreground mt-0.5 text-[11px] tabular-nums">
              {formatWhen(row.original.createdAt)}
              {row.original.lastEvent
                ? ` · ${row.original.lastEvent}`
                : ""}
            </p>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <AdminHubHeader
        title="Email"
        description={
          <>
            Resend inbox for outbound and inbound mail. Compose sends as{" "}
            <span className="text-foreground font-medium">{senderName}</span>.
          </>
        }
      />

      {!configured ? (
        <div className="border-border bg-card mb-6 border p-5 text-sm">
          <p className="text-foreground font-medium">Connect Resend</p>
          <p className="text-muted-foreground mt-1 leading-relaxed">
            {configError} Add{" "}
            <code className="text-foreground text-xs">RESEND_API_KEY</code> and{" "}
            <code className="text-foreground text-xs">RESEND_FROM_EMAIL</code>,
            then refresh.
          </p>
        </div>
      ) : null}

      <AdminPageTabs
        tabs={BOX_TABS}
        value={box}
        onValueChange={setBox}
        className="mb-3"
      />

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        searchKey="from"
        searchPlaceholder="Search…"
        manualFiltering
        searchValue={search}
        onSearchChange={(value) => setSearch(value)}
        manualPagination
        pageCount={pageCount}
        pagination={pagination}
        onPaginationChange={setPagination}
        totalItems={
          hasMore
            ? (pagination.pageIndex + 1) * PAGE_SIZE + 1
            : pagination.pageIndex * PAGE_SIZE + items.length
        }
        defaultPageSize={PAGE_SIZE}
        onRowClick={(row) => void openEmail(row)}
        leftActions={
          <Button
            type="button"
            onClick={() => startCompose(null)}
            disabled={!configured}
          >
            <PenSquareIcon className="h-4 w-4" />
            Compose
          </Button>
        }
        rightActions={
          <Select
            value={days}
            onValueChange={(value) => setDays(value as DaysFilter)}
          >
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="15">Last 15 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <Sheet
        open={Boolean(selectedId)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null);
            setDetail(null);
          }
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 sm:max-w-4xl!"
        >
          <SheetHeader className="border-border border-b pb-4">
            <SheetTitle className="text-base leading-snug">
              {detail?.subject || (
                <>
                  <span className="sr-only">Email</span>
                  {detailLoading ? <Skeleton className="h-5 w-56" /> : "Email"}
                </>
              )}
            </SheetTitle>
            <SheetDescription>
              {detail ? (
                <span className="block space-y-1">
                  <span className="block">
                    <span className="text-foreground/80">From</span>{" "}
                    {detail.from}
                  </span>
                  <span className="block">
                    <span className="text-foreground/80">To</span>{" "}
                    {detail.to.join(", ") || "—"}
                  </span>
                  {detail.cc.length ? (
                    <span className="block">
                      <span className="text-foreground/80">Cc</span>{" "}
                      {detail.cc.join(", ")}
                    </span>
                  ) : null}
                  <span className="block">{formatWhen(detail.createdAt)}</span>
                </span>
              ) : (
                <span className="sr-only">Fetching message</span>
              )}
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {detailLoading ? (
              <div className="space-y-3 px-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            ) : detail?.html ? (
              <div
                className="prose-job max-w-none px-1 text-sm leading-relaxed [&_img]:max-w-full"
                dangerouslySetInnerHTML={{
                  __html: sanitizeEmailViewHtml(detail.html),
                }}
              />
            ) : detail?.text ? (
              <pre className="text-foreground whitespace-pre-wrap px-1 font-sans text-sm leading-relaxed">
                {detail.text}
              </pre>
            ) : (
              <p className="text-muted-foreground px-1 text-sm">
                No body content available for this message.
              </p>
            )}
          </div>

          {box === "receiving" && detail ? (
            <SheetFooter className="border-border border-t pt-4">
              <Button
                type="button"
                onClick={() => startReply(detail)}
              >
                <ReplyIcon className="size-4" />
                Reply
              </Button>
            </SheetFooter>
          ) : null}
        </SheetContent>
      </Sheet>

      <AdminEmailCompose
        open={composeOpen}
        onOpenChange={(open) => {
          setComposeOpen(open);
          if (!open) setComposeDraft(null);
        }}
        senderLabel={senderLabel}
        draft={composeDraft}
        onSent={() => {
          cursorStackRef.current = [undefined];
          setPagination((p) => ({ ...p, pageIndex: 0 }));
          setBox("sending");
          setReloadToken((n) => n + 1);
        }}
      />
    </>
  );
}
