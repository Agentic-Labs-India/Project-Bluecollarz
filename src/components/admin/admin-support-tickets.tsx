"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { getProfileIdLabel, PROFILE_TYPES } from "@/lib/profile-types";
import type {
  SupportPriority,
  SupportSeriousness,
  SupportStatus,
  SupportTicketDetail,
  SupportTicketListItem,
} from "@/lib/support/types";
import {
  SUPPORT_PRIORITIES,
  SUPPORT_SERIOUSNESS,
  SUPPORT_STATUSES,
} from "@/lib/support/types";
import { cn } from "@/lib/utils";

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function label(value: string) {
  return value.replace(/_/g, " ");
}

function TonePill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "neutral" | "warn" | "danger" | "ok";
}) {
  return (
    <span
      className={cn(
        "inline-flex border px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase",
        tone === "neutral" && "border-border text-muted-foreground",
        tone === "warn" && "border-border text-foreground",
        tone === "danger" && "border-destructive/40 text-destructive",
        tone === "ok" && "border-border/60 text-foreground/70",
      )}
    >
      {children}
    </span>
  );
}

function priorityTone(
  priority: SupportPriority,
): "neutral" | "warn" | "danger" {
  if (priority === "urgent" || priority === "high") return "danger";
  if (priority === "medium") return "warn";
  return "neutral";
}

function seriousnessTone(
  seriousness: SupportSeriousness,
): "neutral" | "warn" | "danger" {
  if (seriousness === "critical" || seriousness === "high") return "danger";
  if (seriousness === "medium") return "warn";
  return "neutral";
}

export function AdminSupportTickets() {
  const [items, setItems] = useState<SupportTicketListItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [profileTypeFilter, setProfileTypeFilter] = useState<string>("all");
  const [seriousnessFilter, setSeriousnessFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SupportTicketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (priorityFilter !== "all") params.set("priority", priorityFilter);
      if (profileTypeFilter !== "all") {
        params.set("profileType", profileTypeFilter);
      }
      if (seriousnessFilter !== "all") {
        params.set("seriousness", seriousnessFilter);
      }
      const res = await fetch(
        `/api/admin/support/tickets?${params.toString()}`,
      );
      const json = (await res.json().catch(() => ({}))) as {
        items?: SupportTicketListItem[];
        hasMore?: boolean;
        error?: string;
      };
      if (!res.ok) {
        toast.error(json.error || "Could not load tickets");
        setItems([]);
        setHasMore(false);
        return;
      }
      setItems(json.items ?? []);
      setHasMore(Boolean(json.hasMore));
    } catch {
      toast.error("Could not load tickets");
      setItems([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, profileTypeFilter, seriousnessFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openTicket(item: SupportTicketListItem) {
    setSelectedId(item.id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/support/tickets/${item.id}`);
      const json = (await res.json().catch(() => ({}))) as {
        ticket?: SupportTicketDetail;
        error?: string;
      };
      if (!res.ok || !json.ticket) {
        toast.error(json.error || "Could not open ticket");
        setSelectedId(null);
        return;
      }
      setDetail(json.ticket);
    } catch {
      toast.error("Could not open ticket");
      setSelectedId(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function setStatus(status: SupportStatus) {
    if (!detail) return;
    setUpdating(true);
    try {
      const res = await fetch("/api/admin/support/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: detail.id, status }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        item?: SupportTicketListItem;
        error?: string;
      };
      if (!res.ok || !json.item) {
        toast.error(json.error || "Could not update status");
        return;
      }
      const next = json.item;
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              status: next.status,
              updatedAt: next.updatedAt,
            }
          : prev,
      );
      setItems((prev) => {
        const mapped = prev.map((row) => (row.id === next.id ? next : row));
        if (statusFilter !== "all" && statusFilter !== status) {
          return mapped.filter((row) => row.id !== next.id);
        }
        return mapped;
      });
      toast.success(`Marked ${label(status)}`);
    } catch {
      toast.error("Could not update status");
    } finally {
      setUpdating(false);
    }
  }

  const columns: ColumnDef<SupportTicketListItem>[] = useMemo(
    () => [
      {
        id: "search",
        accessorFn: (row) =>
          `${row.id} ${row.email} ${row.summary} ${row.profileType} ${row.problemType}`,
        header: "Ticket",
        cell: ({ row }) => (
          <div className="min-w-0 max-w-[200px]">
            <p className="text-foreground truncate text-sm font-medium">
              {row.original.summary}
            </p>
            <p className="text-muted-foreground mt-0.5 truncate font-mono text-[11px]">
              {row.original.id}
            </p>
          </div>
        ),
      },
      {
        id: "user",
        accessorFn: (row) => row.email,
        header: "User",
        cell: ({ row }) => (
          <p className="text-foreground truncate text-sm">
            {row.original.email}
          </p>
        ),
      },
      {
        id: "profileType",
        accessorKey: "profileType",
        header: "Type",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {getProfileIdLabel(row.original.profileType)}
          </span>
        ),
      },
      {
        id: "problemType",
        accessorKey: "problemType",
        header: "Issue",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm capitalize">
            {label(row.original.problemType)}
          </span>
        ),
      },
      {
        id: "priority",
        accessorKey: "priority",
        header: "Priority",
        cell: ({ row }) => (
          <TonePill tone={priorityTone(row.original.priority)}>
            {row.original.priority}
          </TonePill>
        ),
      },
      {
        id: "seriousness",
        accessorKey: "seriousness",
        header: "Seriousness",
        cell: ({ row }) => (
          <TonePill tone={seriousnessTone(row.original.seriousness)}>
            {row.original.seriousness}
          </TonePill>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm capitalize">
            {label(row.original.status)}
          </span>
        ),
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: "Opened",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm tabular-nums">
            {formatWhen(row.original.createdAt)}
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
        searchPlaceholder="Search tickets…"
        hideColumns
        onRowClick={(row) => void openTicket(row)}
        rightActions={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Select
              value={profileTypeFilter}
              onValueChange={setProfileTypeFilter}
            >
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {PROFILE_TYPES.map((profileType) => (
                  <SelectItem key={profileType} value={profileType}>
                    {getProfileIdLabel(profileType)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                {SUPPORT_PRIORITIES.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {label(priority)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={seriousnessFilter}
              onValueChange={setSeriousnessFilter}
            >
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Seriousness" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All seriousness</SelectItem>
                {SUPPORT_SERIOUSNESS.map((seriousness) => (
                  <SelectItem key={seriousness} value={seriousness}>
                    {label(seriousness)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {SUPPORT_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {label(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />
      {hasMore ? (
        <p className="text-muted-foreground mt-3 text-xs">
          Showing the latest {items.length} tickets. Narrow filters to find
          older ones.
        </p>
      ) : null}

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
              {detail?.summary || (detailLoading ? "Loading…" : "Ticket")}
            </SheetTitle>
            <SheetDescription>
              {detail ? (
                <span className="block space-y-1">
                  <span className="block font-mono text-[11px]">
                    {detail.id}
                  </span>
                  <span className="block">{detail.email}</span>
                  <span className="block capitalize">
                    Issue · {label(detail.problemType)}
                  </span>
                  <span className="block">
                    Opened {formatWhen(detail.createdAt)} · Updated{" "}
                    {formatWhen(detail.updatedAt)}
                  </span>
                </span>
              ) : (
                "Fetching ticket…"
              )}
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            {detailLoading ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : detail ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="border-border bg-card min-w-0 border p-3">
                    <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                      Type
                    </p>
                    <p className="text-foreground mt-1.5 text-sm font-medium">
                      {getProfileIdLabel(detail.profileType)}
                    </p>
                  </div>
                  <div className="border-border bg-card min-w-0 border p-3">
                    <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                      Priority
                    </p>
                    <div className="mt-1.5">
                      <TonePill tone={priorityTone(detail.priority)}>
                        {label(detail.priority)}
                      </TonePill>
                    </div>
                  </div>
                  <div className="border-border bg-card min-w-0 border p-3">
                    <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                      Seriousness
                    </p>
                    <div className="mt-1.5">
                      <TonePill tone={seriousnessTone(detail.seriousness)}>
                        {label(detail.seriousness)}
                      </TonePill>
                    </div>
                  </div>
                  <div className="border-border bg-card min-w-0 border p-3">
                    <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                      Status
                    </p>
                    <div className="mt-1.5">
                      <TonePill
                        tone={
                          detail.status === "resolved" ||
                          detail.status === "closed"
                            ? "ok"
                            : detail.status === "in_progress"
                              ? "warn"
                              : "neutral"
                        }
                      >
                        {label(detail.status)}
                      </TonePill>
                    </div>
                  </div>
                </div>

                <Accordion
                  type="multiple"
                  defaultValue={["summary"]}
                  className="border-border border"
                >
                  <AccordionItem value="summary" className="px-3">
                    <AccordionTrigger className="py-3 hover:no-underline">
                      Summary
                    </AccordionTrigger>
                    <AccordionContent className="text-foreground">
                      <p className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">
                        {detail.summary}
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="transcript" className="px-3">
                    <AccordionTrigger className="py-3 hover:no-underline">
                      <span className="flex items-center gap-2">
                        Transcript
                        <span className="text-muted-foreground text-xs font-normal tabular-nums">
                          {detail.transcript.length}{" "}
                          {detail.transcript.length === 1 ? "turn" : "turns"}
                        </span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="text-foreground">
                      {detail.transcript.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                          No transcript captured.
                        </p>
                      ) : (
                        <ul className="border-border divide-border divide-y border">
                          {detail.transcript.map((turn, index) => (
                            <li
                              key={`${turn.role}-${index}`}
                              className="px-3 py-2.5"
                            >
                              <p className="text-foreground text-[11px] font-medium tracking-wide uppercase">
                                {turn.role}
                              </p>
                              <p className="text-muted-foreground mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                                {turn.content}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </>
            ) : null}
          </div>

          {detail ? (
            <SheetFooter className="border-border shrink-0 border-t">
              <div className="flex w-full gap-2">
                {detail.status !== "in_progress" ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full flex-1"
                    disabled={updating}
                    onClick={() => void setStatus("in_progress")}
                  >
                    In progress
                  </Button>
                ) : null}
                {detail.status !== "resolved" ? (
                  <Button
                    type="button"
                    className="w-full flex-1"
                    disabled={updating}
                    onClick={() => void setStatus("resolved")}
                  >
                    Resolve
                  </Button>
                ) : null}
                {detail.status !== "closed" ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full flex-1"
                    disabled={updating}
                    onClick={() => void setStatus("closed")}
                  >
                    Close
                  </Button>
                ) : null}
              </div>
            </SheetFooter>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
