"use client";

import { useMemo, useState } from "react";
import { MedicalDateField } from "@/components/admin/medical-date-field";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
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
import {
  MEDICAL_QUEUE_STATUSES,
  type MedicalCenterListItem,
  type MedicalQueueQuery,
  type MedicalQueueStatus,
} from "@/lib/medical/types";

const STATUS_LABEL: Record<MedicalQueueStatus, string> = {
  unscheduled: "Unscheduled",
  scheduled: "Scheduled",
  completed: "Completed",
  no_show: "No-show",
  unfit: "Unfit",
  cancelled: "Cancelled",
};

type CenterOption = { value: string; label: string };

export function AdminMedicalFilterSheet({
  open,
  onOpenChange,
  value,
  onApply,
  centers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: MedicalQueueQuery;
  onApply: (next: MedicalQueueQuery) => void;
  centers: MedicalCenterListItem[];
}) {
  const [draft, setDraft] = useState<MedicalQueueQuery>(value);
  const options = useMemo<CenterOption[]>(
    () =>
      [...centers]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((center) => ({
          value: center.id,
          label: center.active
            ? `${center.name} · ${center.city}`
            : `${center.name} · ${center.city} (inactive)`,
        })),
    [centers],
  );
  const selected =
    options.find((option) => option.value === draft.centerId) ?? null;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(value);
        onOpenChange(next);
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 sm:max-w-md!"
      >
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>
            Filter by center, appointment date, and status.
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              Center
            </Label>
            <Combobox
              items={options}
              value={selected}
              onValueChange={(next) =>
                setDraft((prev) => ({
                  ...prev,
                  centerId:
                    next && typeof next === "object" ? next.value : undefined,
                }))
              }
              isItemEqualToValue={(a, b) => a.value === b.value}
              autoHighlight
            >
              <ComboboxInput
                className="w-full"
                placeholder="Search center…"
                showClear={Boolean(draft.centerId)}
              />
              <ComboboxContent className="w-[var(--anchor-width)]">
                <ComboboxEmpty>No center found.</ComboboxEmpty>
                <ComboboxList>
                  {(item) => (
                    <ComboboxItem key={item.value} value={item}>
                      {item.label}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              Status
            </Label>
            <Select
              value={draft.status ?? "all"}
              onValueChange={(status) =>
                setDraft((prev) => ({
                  ...prev,
                  status:
                    status === "all"
                      ? undefined
                      : (status as MedicalQueueStatus),
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {MEDICAL_QUEUE_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_LABEL[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              From date
            </Label>
            <MedicalDateField
              value={draft.from ?? ""}
              onChange={(from) =>
                setDraft((prev) => ({ ...prev, from: from || undefined }))
              }
              placeholder="Any start date"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              To date
            </Label>
            <MedicalDateField
              value={draft.to ?? ""}
              onChange={(to) =>
                setDraft((prev) => ({ ...prev, to: to || undefined }))
              }
              placeholder="Any end date"
            />
          </div>
        </div>
        <SheetFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const empty = {};
              setDraft(empty);
              onApply(empty);
              onOpenChange(false);
            }}
          >
            Clear
          </Button>
          <Button
            type="button"
            onClick={() => {
              const from = draft.from;
              const to = draft.to;
              onApply(
                from && to && from > to
                  ? { ...draft, from: to, to: from }
                  : draft,
              );
              onOpenChange(false);
            }}
          >
            Apply
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
