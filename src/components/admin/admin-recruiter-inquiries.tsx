"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
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
import {
  listRecruiterInquiriesAction,
  reviewRecruiterInquiryAction,
} from "@/lib/hire/inquiries/actions";
import type {
  RecruiterInquiryListItem,
  RecruiterInquiryStatus,
} from "@/lib/hire/inquiries/types";
import { cn } from "@/lib/utils";

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="border-border bg-card min-w-0 border p-3">
      <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
        {label}
      </p>
      <p className="text-foreground mt-1.5 text-sm wrap-break-word">{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: RecruiterInquiryStatus }) {
  return (
    <span
      className={cn(
        "inline-flex border px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase",
        status === "approved" && "border-border/60 text-foreground/70",
        status === "rejected" && "border-destructive/40 text-destructive",
        status === "pending" && "border-border text-foreground",
      )}
    >
      {status}
    </span>
  );
}

export function AdminRecruiterInquiries() {
  const [status, setStatus] = useState<"all" | RecruiterInquiryStatus>(
    "pending",
  );
  const [items, setItems] = useState<RecruiterInquiryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [actionLoading, setActionLoading] = useState<
    "approved" | "rejected" | null
  >(null);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listRecruiterInquiriesAction(status);
      if (!result.ok) {
        toast.error(result.error);
        setItems([]);
        return;
      }
      setItems(result.items);
    } catch {
      toast.error("Failed to load inquiries");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function review(next: "approved" | "rejected") {
    if (!selectedId) return;
    setActionLoading(next);
    try {
      const result = await reviewRecruiterInquiryAction(selectedId, {
        status: next,
        adminNote,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        next === "approved" ? "Recruiter approved" : "Request rejected",
      );
      setSelectedId(null);
      setAdminNote("");
      await load();
    } catch {
      toast.error("Update failed");
    } finally {
      setActionLoading(null);
    }
  }

  const columns: ColumnDef<RecruiterInquiryListItem>[] = useMemo(
    () => [
      {
        id: "search",
        accessorFn: (row) =>
          `${row.companyName} ${row.contactName} ${row.email} ${row.industry} ${row.country} ${row.companySize} ${row.website} ${row.about}`,
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
            {row.original.email}
          </p>
        ),
      },
      {
        id: "industry",
        accessorKey: "industry",
        header: "Industry",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {row.original.industry}
          </span>
        ),
      },
      {
        id: "country",
        accessorKey: "country",
        header: "Country",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {row.original.country}
          </span>
        ),
      },
      {
        id: "companySize",
        accessorKey: "companySize",
        header: "Team",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {row.original.companySize}
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
        id: "createdAt",
        accessorKey: "createdAt",
        header: "Submitted",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm tabular-nums">
            {formatDateTimeShort(row.original.createdAt)}
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
        searchPlaceholder="Search inquiries…"
        hideColumns
        onRowClick={(row) => {
          setSelectedId(row.id);
          setAdminNote(row.adminNote || "");
        }}
        rightActions={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Select
              value={status}
              onValueChange={(v) =>
                setStatus(v as "all" | RecruiterInquiryStatus)
              }
            >
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
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
          }
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 sm:max-w-xl!"
        >
          <SheetHeader className="border-border border-b pb-4">
            <SheetTitle>
              {selected?.companyName || (
                <>
                  <span className="sr-only">Inquiry</span>
                  <Skeleton className="h-5 w-40" />
                </>
              )}
            </SheetTitle>
            <SheetDescription>
              {selected ? (
                `${selected.contactName} · ${selected.email}`
              ) : (
                <Skeleton className="h-4 w-48" />
              )}
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            {selected ? (
              <>
                <div className="flex items-center gap-2">
                  <StatusPill status={selected.status} />
                  <span className="text-muted-foreground text-xs">
                    {formatDateTimeShort(selected.createdAt)}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Contact" value={selected.contactName} />
                  <Field label="Company" value={selected.companyName} />
                  <Field label="Email" value={selected.email} />
                  <Field
                    label="Phone"
                    value={`+${selected.phoneCountryCode} ${selected.phoneNumber}`}
                  />
                  <Field label="Industry" value={selected.industry} />
                  <Field label="Team size" value={selected.companySize} />
                  <Field label="Country" value={selected.country} />
                  <Field label="Website" value={selected.website || null} />
                </div>
                <Field label="About" value={selected.about} />
                {selected.reviewedByEmail ? (
                  <p className="text-muted-foreground text-xs">
                    Reviewed by {selected.reviewedByEmail}
                    {selected.reviewedAt
                      ? ` · ${formatDateTimeShort(selected.reviewedAt)}`
                      : ""}
                  </p>
                ) : null}
                {selected.status === "pending" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="adminNote">Admin note (optional)</Label>
                    <Textarea
                      id="adminNote"
                      rows={3}
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder="Reason or internal note…"
                    />
                  </div>
                ) : selected.adminNote ? (
                  <Field label="Admin note" value={selected.adminNote} />
                ) : null}
              </>
            ) : null}
          </div>

          {selected?.status === "pending" ? (
            <SheetFooter className="border-border gap-2 border-t p-4 sm:flex-row">
              <Button
                variant="outline"
                disabled={actionLoading !== null}
                onClick={() => void review("rejected")}
              >
                {actionLoading === "rejected" ? "Rejecting…" : "Reject"}
              </Button>
              <Button
                disabled={actionLoading !== null}
                onClick={() => void review("approved")}
              >
                {actionLoading === "approved"
                  ? "Approving…"
                  : "Approve as recruiter"}
              </Button>
            </SheetFooter>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
