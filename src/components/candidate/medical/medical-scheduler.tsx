"use client";

import {
  ArrowUpRightIcon,
  CalendarIcon,
  CheckCircle2Icon,
  MapPinIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PrimaryDitherBand } from "@/components/landing/primary-dither";
import { AppPage } from "@/components/layout/app-page";
import { MedicalPageSkeleton } from "@/components/layout/page-skeleton";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { dateOnlyToLocalDate, formatDateOnly } from "@/lib/core/dates";
import {
  formatClock,
  formatMedicalDateTime,
  isOperatingDay,
  medicalTodayYmd,
} from "@/lib/medical/time";
import type {
  CandidateMedicalAppointment,
  CandidateMedicalCenter,
  CandidateMedicalScheduleContext,
} from "@/lib/medical/types";
import { cn } from "@/lib/utils";

export function CandidateMedicalScheduler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const jobId = searchParams.get("jobId")?.trim() || undefined;
  const [context, setContext] =
    useState<CandidateMedicalScheduleContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [centerId, setCenterId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const today = medicalTodayYmd();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = jobId ? `?jobId=${encodeURIComponent(jobId)}` : "";
      const res = await fetch(`/api/candidate/medical-schedule${params}`);
      const json = (await res.json().catch(() => ({}))) as
        | CandidateMedicalScheduleContext
        | { error?: string };
      if (!res.ok) {
        setContext(null);
        setError(
          "error" in json && json.error
            ? json.error
            : "No selected role to schedule",
        );
        return;
      }
      setContext(json as CandidateMedicalScheduleContext);
    } catch {
      setError("Could not load scheduling");
      setContext(null);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedCenter = useMemo(
    () => context?.centers.find((center) => center.id === centerId) ?? null,
    [context, centerId],
  );

  useEffect(() => {
    if (!centerId || !date || !selectedCenter) {
      setSlots([]);
      return;
    }
    if (!isOperatingDay(date, selectedCenter.hours.days)) {
      setSlots([]);
      return;
    }
    let cancelled = false;
    setSlotsLoading(true);
    const params = new URLSearchParams({ centerId, date });
    if (context?.jobId) params.set("jobId", context.jobId);
    void fetch(`/api/candidate/medical-slots?${params}`)
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as {
          slots?: string[];
        };
        if (cancelled) return;
        setSlots(res.ok ? (json.slots ?? []) : []);
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [centerId, date, selectedCenter, context?.jobId]);

  async function confirm() {
    if (!context || !centerId || !date || !time) return;
    setSaving(true);
    try {
      const res = await fetch("/api/candidate/medical-appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: context.jobId,
          centerId,
          date,
          time,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(json.error || "Could not schedule appointment");
        return;
      }
      toast.success("Medical test scheduled");
      setEditing(false);
      await load();
      router.refresh();
    } catch {
      toast.error("Could not schedule appointment");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <MedicalPageSkeleton />;
  }

  if (error || !context) {
    return (
      <AppPage className="py-10">
        <p className="text-foreground text-lg font-semibold">
          Schedule Medical Test
        </p>
        <p className="text-muted-foreground mt-2 text-sm">
          {error || "You need to be selected for a role first."}
        </p>
        <Button asChild className="mt-4">
          <Link href="/candidate/home">Back to home</Link>
        </Button>
      </AppPage>
    );
  }

  const booked = context.appointment;
  if (booked && !editing) {
    if (booked.status === "completed") {
      return (
        <AppPage>
          <Header
            jobTitle={context.jobTitle}
            title="Medical test complete"
            copy="Your next step is the offer letter."
          />
          <Button asChild>
            <Link href={`/candidate/explore?jobId=${context.jobId}`}>
              Back to role
            </Link>
          </Button>
        </AppPage>
      );
    }
    if (booked.status === "no_show" || booked.status === "unfit") {
      return (
        <AppPage>
          <Header
            jobTitle={context.jobTitle}
            title="Thank you for showing interest"
            copy="You can continue with other opportunities."
          />
          <Button asChild>
            <Link href="/candidate/explore">See other opportunities</Link>
          </Button>
        </AppPage>
      );
    }
    if (booked.status === "scheduled") {
      return (
        <AppPage>
          <Header jobTitle={context.jobTitle} />
          <BookedCard
            appointment={booked}
            onReschedule={() => {
              setCenterId(booked.center.id);
              setEditing(true);
            }}
          />
        </AppPage>
      );
    }
  }

  return (
    <AppPage>
      <Header jobTitle={context.jobTitle} />
      <div className="space-y-6">
        <section className="space-y-3">
          <p className="text-foreground text-sm font-medium">Medical center</p>
          {context.centers.length ? (
            <ul className="space-y-2">
              {context.centers.map((center) => (
                <CenterChoice
                  key={center.id}
                  center={center}
                  selected={centerId === center.id}
                  onSelect={() => {
                    setCenterId(center.id);
                    setTime("");
                    if (date && !isOperatingDay(date, center.hours.days)) {
                      setDate("");
                    }
                  }}
                />
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">
              No medical centers are available yet.
            </p>
          )}
        </section>

        {selectedCenter ? (
          <section className="grid gap-6 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
            <div className="border-border bg-card border p-3">
              <Calendar
                mode="single"
                selected={dateOnlyToLocalDate(date)}
                onSelect={(next) => {
                  setDate(next ? formatDateOnly(next) : "");
                  setTime("");
                }}
                disabled={[
                  { before: dateOnlyToLocalDate(today) ?? new Date() },
                  (value) =>
                    !isOperatingDay(
                      formatDateOnly(value),
                      selectedCenter.hours.days,
                    ),
                ]}
                className="w-full [--cell-size:2.5rem]"
              />
            </div>
            <div>
              <p className="text-foreground text-sm font-medium">Time · IST</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {selectedCenter.hoursLabel}
              </p>
              {!date ? (
                <p className="text-muted-foreground mt-4 text-sm">
                  Pick an open day.
                </p>
              ) : slotsLoading ? (
                <SlotChipsSkeleton />
              ) : slots.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {slots.map((slot) => (
                    <Button
                      key={slot}
                      type="button"
                      size="sm"
                      variant={time === slot ? "default" : "outline"}
                      onClick={() => setTime(slot)}
                    >
                      {formatClock(slot)}
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground mt-4 text-sm">
                  No open slots on this day.
                </p>
              )}
            </div>
          </section>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            size="lg"
            className="w-full sm:w-auto"
            disabled={!centerId || !date || !time || saving}
            onClick={() => void confirm()}
          >
            {saving
              ? "Scheduling…"
              : booked
                ? "Update appointment"
                : "Confirm appointment"}
          </Button>
          {booked ? (
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          ) : (
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full sm:w-auto"
            >
              <Link href="/candidate/home">Back</Link>
            </Button>
          )}
        </div>
      </div>
    </AppPage>
  );
}

function Header({
  jobTitle,
  title = "Schedule Medical Test",
  copy = "Pick a center, then a day and time it is open. Times are IST.",
}: {
  jobTitle: string;
  title?: string;
  copy?: string;
}) {
  return (
    <header className="mb-6">
      <p className="text-muted-foreground mb-1 text-sm">{jobTitle}</p>
      <h1 className="text-foreground text-2xl font-semibold tracking-tight md:text-3xl">
        {title}
      </h1>
      <p className="text-muted-foreground mt-2 max-w-xl text-sm">{copy}</p>
    </header>
  );
}

function CenterChoice({
  center,
  selected,
  onSelect,
}: {
  center: CandidateMedicalCenter;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "border-border w-full rounded-none border p-4 text-left transition-colors",
          selected ? "border-primary bg-primary/5" : "hover:bg-muted/40",
        )}
      >
        <p className="text-foreground font-medium">{center.name}</p>
        <p className="text-muted-foreground mt-1 flex items-start gap-1.5 text-sm">
          <MapPinIcon className="mt-0.5 size-3.5 shrink-0" />
          <span>
            {center.address}
            {center.placeLabel ? ` · ${center.placeLabel}` : ""}
          </span>
        </p>
        <p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs">
          <CalendarIcon className="size-3.5 shrink-0" />
          {center.hoursLabel}
        </p>
      </button>
    </li>
  );
}

function SlotChipsSkeleton() {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"].map((id) => (
        <Skeleton key={id} className="h-8 w-20" />
      ))}
    </div>
  );
}

function BookedCard({
  appointment,
  onReschedule,
}: {
  appointment: CandidateMedicalAppointment;
  onReschedule: () => void;
}) {
  const { center } = appointment;
  return (
    <div className="border-border bg-card overflow-hidden border">
      <PrimaryDitherBand seed={`medical-booked-${appointment.id}`} />
      <div className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2Icon className="text-primary mt-0.5 size-5 shrink-0" />
          <div>
            <p className="text-foreground text-sm font-medium">
              Appointment scheduled
            </p>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              {formatMedicalDateTime(appointment.scheduledAt)} IST at{" "}
              {center.name}.
            </p>
          </div>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {center.address}
          {center.placeLabel ? ` · ${center.placeLabel}` : ""}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button size="lg" className="w-full sm:w-auto" asChild>
            <a
              href={center.directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Get directions
              <ArrowUpRightIcon className="size-4" />
            </a>
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={onReschedule}
          >
            Reschedule
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="w-full sm:w-auto"
          >
            <Link href="/candidate/home">Continue</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
