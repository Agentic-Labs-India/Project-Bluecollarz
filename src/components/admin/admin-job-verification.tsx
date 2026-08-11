"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  AdminJobVerificationItem,
  AdminJobVerificationListItem,
} from "@/lib/admin/job-verification";
import { JOB_STATUS_LABELS } from "@/lib/jobs";
import { RichTextContent } from "@/components/ui/rich-text-content";

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="border-border bg-card min-w-0 border p-3">
      <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
        {label}
      </p>
      <p className="text-foreground mt-1.5 text-sm wrap-break-word whitespace-pre-wrap">
        {value}
      </p>
    </div>
  );
}

function ListField({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="border-border bg-card min-w-0 border p-3">
      <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
        {label}
      </p>
      <ul className="text-foreground mt-1.5 list-disc space-y-1 ps-4 text-sm">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function AdminJobVerification() {
  const [items, setItems] = useState<AdminJobVerificationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminJobVerificationItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [denyOpen, setDenyOpen] = useState(false);
  const [denyReason, setDenyReason] = useState("");
  const [actionLoading, setActionLoading] = useState<"approve" | "deny" | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/jobs");
      const json = (await res.json().catch(() => ({}))) as {
        items?: AdminJobVerificationListItem[];
        error?: string;
      };
      if (!res.ok) {
        toast.error(json.error || "Failed to load jobs");
        setItems([]);
        return;
      }
      setItems(json.items ?? []);
    } catch {
      toast.error("Failed to load jobs");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);
    setDetail(null);

    void (async () => {
      try {
        const res = await fetch(`/api/admin/jobs/${selectedId}`);
        const json = (await res.json().catch(() => ({}))) as {
          item?: AdminJobVerificationItem;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok || !json.item) {
          toast.error(json.error || "Failed to load job details");
          setSelectedId(null);
          return;
        }
        setDetail(json.item);
      } catch {
        if (!cancelled) {
          toast.error("Failed to load job details");
          setSelectedId(null);
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  async function accept() {
    if (!selectedId) return;
    setActionLoading("approve");
    try {
      const res = await fetch(`/api/admin/jobs/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(json.error || "Accept failed");
        return;
      }
      toast.success("Accepted — job is live and recruiter emailed");
      setSelectedId(null);
      await load();
    } catch {
      toast.error("Accept failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function decline() {
    if (!selectedId) return;
    const reason = denyReason.trim();
    if (reason.length < 3) {
      toast.error("Please enter a decline reason");
      return;
    }
    setActionLoading("deny");
    try {
      const res = await fetch(`/api/admin/jobs/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deny", reason }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(json.error || "Decline failed");
        return;
      }
      toast.success("Declined — moved to draft and recruiter emailed");
      setDenyOpen(false);
      setDenyReason("");
      setSelectedId(null);
      await load();
    } catch {
      toast.error("Decline failed");
    } finally {
      setActionLoading(null);
    }
  }

  const columns = useMemo<ColumnDef<AdminJobVerificationListItem>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Role",
        cell: ({ row }) => (
          <span className="text-foreground text-sm font-medium">
            {row.original.title}
          </span>
        ),
      },
      {
        accessorKey: "ownerEmail",
        header: "Recruiter",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {row.original.ownerName || row.original.ownerEmail || "—"}
          </span>
        ),
      },
      {
        accessorKey: "pay",
        header: "Pay",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm tabular-nums">
            {row.original.pay}
          </span>
        ),
      },
      {
        accessorKey: "updatedAt",
        header: "Submitted",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm tabular-nums">
            {new Date(row.original.updatedAt).toLocaleString()}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        hideSearch
        searchKey="title"
        onRowClick={(row) => setSelectedId(row.id)}
      />

      <Sheet
        open={Boolean(selectedId)}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-xl!"
        >
          <SheetHeader className="shrink-0 border-b px-4 py-4">
            <SheetTitle className="text-base">
              {detail?.title ?? "Job verification"}
            </SheetTitle>
            <SheetDescription>
              Review the full posting. Accept to publish live, or decline to
              return it to draft.
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {detailLoading || !detail ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full rounded-none" />
                <Skeleton className="h-16 w-full rounded-none" />
                <Skeleton className="h-40 w-full rounded-none" />
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Status"
                    value={JOB_STATUS_LABELS[detail.status]}
                  />
                  <Field label="Pay" value={detail.pay} />
                  <Field label="Type" value={detail.tab.replace(/-/g, " ")} />
                  <Field label="Priority" value={detail.priority ?? null} />
                  <Field label="Work mode" value={detail.locationLabel} />
                  <Field label="Country" value={detail.countryLabel} />
                  <Field label="State / region" value={detail.stateLabel} />
                  <Field
                    label="Submitted"
                    value={new Date(detail.updatedAt).toLocaleString()}
                  />
                </div>

                <Field
                  label="Recruiter"
                  value={
                    [detail.ownerName, detail.ownerEmail]
                      .filter(Boolean)
                      .join(" · ") || "—"
                  }
                />

                <div className="border-border bg-card min-w-0 border p-3">
                  <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                    Overview
                  </p>
                  <div className="mt-2">
                    <RichTextContent html={detail.overviewHtml} />
                  </div>
                </div>
                <ListField label="Application stages" items={detail.stages} />
                <ListField
                  label="Custom questions"
                  items={detail.customQuestions}
                />
              </>
            )}
          </div>

          <SheetFooter className="shrink-0 border-t px-4 py-4">
            <div className="flex w-full flex-wrap gap-2">
              <Button
                className="flex-1"
                disabled={!detail || actionLoading !== null}
                onClick={() => void accept()}
              >
                {actionLoading === "approve" ? "Accepting…" : "Accept"}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                disabled={!detail || actionLoading !== null}
                onClick={() => {
                  setDenyReason("");
                  setDenyOpen(true);
                }}
              >
                Decline
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={denyOpen} onOpenChange={setDenyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline job posting</DialogTitle>
            <DialogDescription>
              The role returns to draft. The recruiter is emailed this reason via
              Resend.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="deny-reason">Reason</Label>
            <Textarea
              id="deny-reason"
              value={denyReason}
              onChange={(e) => setDenyReason(e.target.value)}
              placeholder="Why is this posting declined?"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDenyOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={actionLoading !== null}
              onClick={() => void decline()}
            >
              {actionLoading === "deny" ? "Declining…" : "Decline & email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
