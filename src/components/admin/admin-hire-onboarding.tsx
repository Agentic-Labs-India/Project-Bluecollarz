"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { HireOnboardingPackView } from "@/components/hire/onboarding/pack-view";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTimeShort } from "@/lib/core/dates";
import { countryName } from "@/lib/core/geo/places";
import type {
  HireOnboardingListItem,
  HireOnboardingStatus,
} from "@/lib/hire/onboarding/types";
import { cn } from "@/lib/utils";

function StatusPill({ status }: { status: HireOnboardingStatus }) {
  return (
    <span
      className={cn(
        "inline-flex border px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase",
        status === "verified" && "border-border/60 text-foreground/70",
        status === "rejected" && "border-destructive/40 text-destructive",
        status === "submitted" && "border-border text-foreground",
        status === "draft" && "border-border/60 text-muted-foreground",
      )}
    >
      {status}
    </span>
  );
}

export function AdminHireOnboarding() {
  const [status, setStatus] = useState<"all" | HireOnboardingStatus>(
    "submitted",
  );
  const [items, setItems] = useState<HireOnboardingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [adminNote, setAdminNote] = useState("");
  const [actionLoading, setActionLoading] = useState<
    "verified" | "rejected" | null
  >(null);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/hire-onboardings?status=${encodeURIComponent(status)}`,
      );
      const json = (await res.json().catch(() => ({}))) as {
        items?: HireOnboardingListItem[];
        error?: string;
      };
      if (!res.ok) {
        toast.error(json.error || "Failed to load onboarding");
        setItems([]);
        return;
      }
      setItems(json.items ?? []);
    } catch {
      toast.error("Failed to load onboarding");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function review(next: "verified" | "rejected") {
    if (!selectedId) return;
    const note = adminNote.trim();
    if (next === "rejected" && note.length < 8) {
      toast.error("Describe the changes required");
      return;
    }
    setActionLoading(next);
    try {
      const res = await fetch(`/api/admin/hire-onboardings/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: next,
          ...(next === "rejected" ? { adminNote: note } : {}),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        item?: HireOnboardingListItem;
        error?: string;
      };
      if (!res.ok) {
        toast.error(json.error || "Update failed");
        return;
      }
      toast.success(
        next === "verified"
          ? "Company verified"
          : "Sent back with changes required",
      );
      setRejectOpen(false);
      setSelectedId(null);
      setAdminNote("");
      await load();
    } catch {
      toast.error("Update failed");
    } finally {
      setActionLoading(null);
    }
  }

  const columns: ColumnDef<HireOnboardingListItem>[] = useMemo(
    () => [
      {
        id: "search",
        accessorFn: (row) =>
          `${row.companyName} ${row.contactName} ${row.email} ${row.identity.legalName} ${row.location.countryCode ?? ""} ${row.location.city}`,
        header: "Company",
        cell: ({ row }) => (
          <div className="min-w-0 max-w-[220px]">
            <p className="text-foreground truncate text-sm font-medium">
              {row.original.companyName}
            </p>
            <p className="text-muted-foreground mt-0.5 truncate text-xs">
              {row.original.contactName}
            </p>
          </div>
        ),
      },
      {
        id: "email",
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <p className="text-foreground truncate text-sm">
            {row.original.email || "—"}
          </p>
        ),
      },
      {
        id: "country",
        accessorFn: (row) => row.location.countryCode,
        header: "Country",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {countryName(row.original.location.countryCode) || "—"}
          </span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusPill status={row.original.status} />,
      },
      {
        id: "submittedAt",
        accessorKey: "submittedAt",
        header: "Submitted",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm tabular-nums">
            {row.original.submittedAt
              ? formatDateTimeShort(row.original.submittedAt)
              : "—"}
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
        searchKey="search"
        searchPlaceholder="Search company onboarding…"
        hideColumns
        onRowClick={(row) => {
          setSelectedId(row.id);
          setAdminNote("");
          setRejectOpen(false);
        }}
        rightActions={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Select
              value={status}
              onValueChange={(v) =>
                setStatus(v as "all" | HireOnboardingStatus)
              }
            >
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => void load()}
            >
              Refresh
            </Button>
          </div>
        }
      />

      <Sheet
        open={Boolean(selectedId)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null);
            setAdminNote("");
            setRejectOpen(false);
          }
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 sm:max-w-2xl!"
        >
          <SheetHeader className="border-border border-b pb-4">
            <SheetTitle>
              {selected?.companyName || (
                <>
                  <span className="sr-only">Onboarding</span>
                  <Skeleton className="h-5 w-40" />
                </>
              )}
            </SheetTitle>
            <SheetDescription>
              {selected ? (
                `${selected.contactName || "Contact"} · ${selected.email || "no email"}`
              ) : (
                <Skeleton className="h-4 w-48" />
              )}
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
            {selected ? (
              <>
                <div className="flex items-center gap-2">
                  <StatusPill status={selected.status} />
                  <span className="text-muted-foreground text-xs">
                    Updated {formatDateTimeShort(selected.updatedAt)}
                  </span>
                </div>

                <HireOnboardingPackView data={selected} />

                {selected.reviewedByEmail ? (
                  <p className="text-muted-foreground text-xs">
                    Reviewed by {selected.reviewedByEmail}
                    {selected.reviewedAt
                      ? ` · ${formatDateTimeShort(selected.reviewedAt)}`
                      : ""}
                  </p>
                ) : null}

                {selected.adminNote ? (
                  <p className="text-sm">
                    <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                      Changes required
                    </span>
                    <span className="text-foreground mt-1.5 block whitespace-pre-wrap">
                      {selected.adminNote}
                    </span>
                  </p>
                ) : null}
              </>
            ) : null}
          </div>

          {selected?.status === "submitted" ? (
            <SheetFooter className="border-border gap-2 border-t p-4 sm:flex-row">
              <Button
                variant="outline"
                disabled={actionLoading !== null}
                onClick={() => {
                  setAdminNote("");
                  setRejectOpen(true);
                }}
              >
                Request changes
              </Button>
              <Button
                disabled={actionLoading !== null}
                onClick={() => void review("verified")}
              >
                {actionLoading === "verified" ? "Verifying…" : "Verify company"}
              </Button>
            </SheetFooter>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog
        open={rejectOpen}
        onOpenChange={(open) => {
          if (actionLoading) return;
          setRejectOpen(open);
          if (!open) setAdminNote("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changes required</DialogTitle>
            <DialogDescription>
              The recruiter returns to onboarding with fields unlocked. This
              note is shown to them until they submit again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="onboarding-changes">What needs to change</Label>
            <Textarea
              id="onboarding-changes"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Tell the recruiter what to fix…"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              disabled={actionLoading !== null}
              onClick={() => setRejectOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={actionLoading !== null || adminNote.trim().length < 8}
              onClick={() => void review("rejected")}
            >
              {actionLoading === "rejected" ? "Sending…" : "Send back"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
