"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MedicalDateField } from "@/components/admin/medical-date-field";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import {
  isOperatingDay,
  medicalTodayYmd,
  slotTimesBetween,
  utcToMedicalParts,
} from "@/lib/medical/time";
import type { MedicalCenterListItem } from "@/lib/medical/types";

export function AdminMedicalScheduleSheet({
  open,
  onOpenChange,
  applicationId,
  candidateName,
  jobTitle,
  appointmentId,
  initialCenterId,
  initialDate,
  initialTime,
  initialNotes,
  centers,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
  candidateName: string;
  jobTitle: string;
  appointmentId?: string | null;
  initialCenterId?: string;
  initialDate?: string;
  initialTime?: string;
  initialNotes?: string;
  centers: MedicalCenterListItem[];
  onSaved: () => void;
}) {
  const activeCenters = useMemo(
    () => centers.filter((center) => center.active),
    [centers],
  );
  const today = medicalTodayYmd();
  const [centerId, setCenterId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [taken, setTaken] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCenterId(initialCenterId ?? "");
    setDate(initialDate ?? "");
    setTime(initialTime ?? "");
    setNotes(initialNotes ?? "");
  }, [open, initialCenterId, initialDate, initialTime, initialNotes]);

  useEffect(() => {
    if (!open || !centerId || !date) {
      setTaken([]);
      return;
    }
    let cancelled = false;
    const params = new URLSearchParams({
      centerId,
      date,
    });
    if (appointmentId) params.set("excludeAppointmentId", appointmentId);
    void fetch(`/api/admin/medical/slots?${params}`)
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as {
          taken?: string[];
        };
        if (cancelled || !res.ok) return;
        setTaken(json.taken ?? []);
      })
      .catch(() => {
        if (!cancelled) setTaken([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, centerId, date, appointmentId]);

  const selectedCenter = activeCenters.find((center) => center.id === centerId);
  const nowTime = utcToMedicalParts(new Date()).time;
  const hourSlots = selectedCenter
    ? slotTimesBetween(selectedCenter.hours.open, selectedCenter.hours.close)
    : [];
  const closed =
    Boolean(selectedCenter && date) &&
    !isOperatingDay(date, selectedCenter?.hours.days ?? []);
  const slots = hourSlots.map((slot) => {
    const past = date === today && slot <= nowTime;
    const booked = taken.includes(slot);
    return { slot, disabled: past || booked || closed, booked };
  });

  async function save() {
    if (!centerId || !date || !time) {
      toast.error("Center, date, and time are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/medical/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          centerId,
          date,
          time,
          notes: notes.trim() || undefined,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(json.error || "Could not schedule appointment");
        return;
      }
      toast.success(
        appointmentId ? "Appointment updated" : "Appointment scheduled",
      );
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error("Could not schedule appointment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {appointmentId ? "Reschedule appointment" : "Schedule appointment"}
          </SheetTitle>
          <SheetDescription>
            {candidateName} · {jobTitle}. Times are IST (Asia/Kolkata).
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-2">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              Medical center
            </Label>
            <Select
              value={centerId || undefined}
              onValueChange={(next) => {
                setCenterId(next);
                setTime("");
                const center = activeCenters.find((item) => item.id === next);
                if (
                  date &&
                  center &&
                  !isOperatingDay(date, center.hours.days)
                ) {
                  setDate("");
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select center" />
              </SelectTrigger>
              <SelectContent>
                {activeCenters.map((center) => (
                  <SelectItem key={center.id} value={center.id}>
                    {center.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCenter ? (
              <p className="text-muted-foreground text-xs">
                {selectedCenter.hoursLabel}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              Date
            </Label>
            <MedicalDateField
              value={date}
              onChange={(next) => {
                setDate(next);
                setTime("");
              }}
              minDate={today}
              isDateDisabled={(ymd) =>
                selectedCenter
                  ? !isOperatingDay(ymd, selectedCenter.hours.days)
                  : false
              }
              placeholder="Pick appointment date"
            />
            {closed ? (
              <p className="text-muted-foreground text-xs">
                This center is closed on that day.
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              Time
            </Label>
            <Select
              value={time || undefined}
              onValueChange={setTime}
              disabled={!date || !centerId || closed}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {slots.map(({ slot, disabled, booked }) => (
                  <SelectItem key={slot} value={slot} disabled={disabled}>
                    {slot}
                    {booked ? " · booked" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              Notes
            </Label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional instructions for the candidate"
              maxLength={2000}
            />
          </div>
        </div>
        <SheetFooter>
          <Button
            type="button"
            disabled={saving || !centerId || !date || !time}
            onClick={() => void save()}
          >
            {saving ? "Saving…" : appointmentId ? "Update" : "Schedule"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
