"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CalendarClockIcon, FilterIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminMedicalCompleteDialog } from "@/components/admin/admin-medical-complete-dialog";
import { AdminMedicalFilterSheet } from "@/components/admin/admin-medical-filter-sheet";
import { AdminMedicalScheduleSheet } from "@/components/admin/admin-medical-schedule-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { formatMedicalDateTime, utcToMedicalParts } from "@/lib/medical/time";
import type {
  MedicalAppointmentListItem,
  MedicalCenterListItem,
  MedicalQueueItem,
  MedicalQueueQuery,
} from "@/lib/medical/types";

function statusBadge(item: MedicalQueueItem) {
  const status = item.appointment?.status ?? "unscheduled";
  if (status === "unscheduled") {
    return <Badge variant="outline">Unscheduled</Badge>;
  }
  if (status === "completed") {
    return <Badge variant="secondary">Completed</Badge>;
  }
  if (status === "scheduled") {
    return <Badge>Scheduled</Badge>;
  }
  return <Badge variant="outline">{status.replace("_", " ")}</Badge>;
}

export function AdminMedicalQueue({
  centers,
}: {
  centers: MedicalCenterListItem[];
}) {
  const [items, setItems] = useState<MedicalQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<MedicalQueueQuery>({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [scheduleTarget, setScheduleTarget] = useState<MedicalQueueItem | null>(
    null,
  );
  const [completeTarget, setCompleteTarget] =
    useState<MedicalAppointmentListItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      if (filters.status) params.set("status", filters.status);
      if (filters.centerId) params.set("centerId", filters.centerId);
      const query = params.toString();
      const res = await fetch(
        `/api/admin/medical/queue${query ? `?${query}` : ""}`,
      );
      const json = (await res.json().catch(() => ({}))) as {
        items?: MedicalQueueItem[];
        error?: string;
      };
      if (!res.ok) {
        toast.error(json.error || "Could not load candidates");
        setItems([]);
        return;
      }
      setItems(json.items ?? []);
    } catch {
      toast.error("Could not load candidates");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markStatus(
    item: MedicalQueueItem,
    status: "no_show" | "unfit",
  ) {
    const appointment = item.appointment;
    if (!appointment || appointment.status !== "scheduled") return;
    const confirmLabel =
      status === "unfit"
        ? "Mark candidate as unfit for this medical test?"
        : "Mark candidate as no-show?";
    if (!window.confirm(confirmLabel)) return;
    try {
      const res = await fetch("/api/admin/medical/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: appointment.id, status }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(json.error || "Could not update appointment");
        return;
      }
      toast.success(
        status === "unfit" ? "Marked as unfit" : "Marked as no-show",
      );
      void load();
    } catch {
      toast.error("Could not update appointment");
    }
  }

  const filterCount = [
    filters.from,
    filters.to,
    filters.status,
    filters.centerId,
  ].filter(Boolean).length;

  const columns: ColumnDef<MedicalQueueItem>[] = [
    {
      accessorKey: "applicantName",
      header: "Candidate",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="text-foreground truncate font-medium">
            {row.original.applicantName || "Candidate"}
          </p>
          <p className="text-muted-foreground truncate text-xs">
            {row.original.applicantEmail || row.original.applicantId}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "jobTitle",
      header: "Role",
      cell: ({ row }) => <p className="truncate">{row.original.jobTitle}</p>,
    },
    {
      id: "appointment",
      header: "Appointment",
      cell: ({ row }) => {
        const appt = row.original.appointment;
        if (!appt) {
          return <span className="text-muted-foreground text-xs">—</span>;
        }
        return (
          <div className="min-w-0">
            <p className="truncate font-medium tabular-nums">
              {formatMedicalDateTime(appt.scheduledAt)}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {appt.centerName}
            </p>
          </div>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => statusBadge(row.original),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const appt = row.original.appointment;
        const scheduled = appt?.status === "scheduled";
        const closed =
          appt?.status === "completed" ||
          appt?.status === "no_show" ||
          appt?.status === "unfit";
        return (
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={closed}
              onClick={(event) => {
                event.stopPropagation();
                setScheduleTarget(row.original);
              }}
            >
              <CalendarClockIcon className="size-3.5" />
              {scheduled ? "Reschedule" : "Schedule"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={!scheduled}
              onClick={(event) => {
                event.stopPropagation();
                void markStatus(row.original, "no_show");
              }}
            >
              No-show
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={!scheduled}
              onClick={(event) => {
                event.stopPropagation();
                void markStatus(row.original, "unfit");
              }}
            >
              Unfit
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!scheduled}
              onClick={(event) => {
                event.stopPropagation();
                if (appt) setCompleteTarget(appt);
              }}
            >
              Complete
            </Button>
          </div>
        );
      },
    },
  ];

  const initial = scheduleTarget?.appointment;
  const parts = initial
    ? utcToMedicalParts(new Date(initial.scheduledAt))
    : null;

  return (
    <>
      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        searchKey="applicantName"
        searchPlaceholder="Search candidates"
        hideColumns
        defaultPageSize={20}
        leftActions={
          <Button
            type="button"
            variant="outline"
            onClick={() => setFilterOpen(true)}
          >
            <FilterIcon className="size-3.5" />
            Filters{filterCount ? ` (${filterCount})` : ""}
          </Button>
        }
      />
      <AdminMedicalFilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        value={filters}
        onApply={setFilters}
        centers={centers}
      />
      {scheduleTarget ? (
        <AdminMedicalScheduleSheet
          open
          onOpenChange={(open) => {
            if (!open) setScheduleTarget(null);
          }}
          applicationId={scheduleTarget.applicationId}
          candidateName={scheduleTarget.applicantName || "Candidate"}
          jobTitle={scheduleTarget.jobTitle}
          appointmentId={
            scheduleTarget.appointment?.status === "scheduled"
              ? scheduleTarget.appointment.id
              : null
          }
          initialCenterId={initial?.centerId}
          initialDate={parts?.date}
          initialTime={parts?.time}
          initialNotes={initial?.notes ?? ""}
          centers={centers}
          onSaved={() => {
            setScheduleTarget(null);
            void load();
          }}
        />
      ) : null}
      <AdminMedicalCompleteDialog
        key={completeTarget?.id ?? "complete"}
        appointment={completeTarget}
        open={Boolean(completeTarget)}
        onOpenChange={(open) => {
          if (!open) setCompleteTarget(null);
        }}
        onCompleted={() => {
          setCompleteTarget(null);
          void load();
        }}
      />
    </>
  );
}
