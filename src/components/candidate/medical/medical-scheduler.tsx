"use client";

import { ArrowUpRightIcon, CheckCircle2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PrimaryDitherBand } from "@/components/landing/primary-dither";
import { AppPage, AppPageTitle } from "@/components/layout/app-page";
import { MedicalPageSkeleton } from "@/components/layout/page-skeleton";
import { DitherButton } from "@/components/shared/dither-button";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
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
  CandidateMedicalScheduleContext,
} from "@/lib/medical/types";

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
      <AppPage>
        <AppPageTitle>Schedule Medical Test</AppPageTitle>
        <p className="text-muted-foreground -mt-5 mb-8 text-sm">
          {error || "You need to be selected for a role first."}
        </p>
        <Button asChild>
          <Link href="/candidate/home">Back to home</Link>
        </Button>
      </AppPage>
    );
  }

  if (!context.medicalConsent) {
    return (
      <AppPage>
        <Header
          jobTitle={context.jobTitle}
          title="Medical consent is off"
          copy="Turn medical consent back on in Settings, then come back to book the test."
        />
        <Button asChild>
          <Link href="/candidate/settings">Open Settings</Link>
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
        <section className="space-y-2">
          <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
            Medical center
          </p>
          {context.centers.length ? (
            <Select
              value={centerId || undefined}
              onValueChange={(id) => {
                setCenterId(id);
                setTime("");
                const next = context.centers.find((center) => center.id === id);
                if (
                  next &&
                  date &&
                  !isOperatingDay(date, next.hours.days)
                ) {
                  setDate("");
                }
              }}
            >
              <SelectTrigger className="h-auto min-h-9 w-full min-w-0 py-2 text-left text-sm whitespace-normal data-[size=default]:h-auto">
                <SelectValue placeholder="Select address" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-w-[min(100vw-2rem,40rem)]">
                {context.centers.map((center) => (
                  <SelectItem
                    key={center.id}
                    value={center.id}
                    className="whitespace-normal text-sm leading-snug"
                  >
                    {center.address}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-muted-foreground text-sm">
              No medical centers are available yet.
            </p>
          )}
        </section>

        {selectedCenter ? (
          <>
            <Separator />
            <section className="grid gap-8 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
              <div>
                <p className="text-muted-foreground mb-3 text-[11px] font-medium tracking-wide uppercase">
                  Date
                </p>
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
                  className="w-full p-0 [--cell-size:2.5rem]"
                />
              </div>
              <div>
                <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                  Time · IST
                </p>
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
          </>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          <DitherButton
            size="lg"
            seed="medical-confirm"
            className="w-full sm:w-auto"
            disabled={!centerId || !date || !time || saving}
            onClick={() => void confirm()}
          >
            {saving
              ? "Scheduling…"
              : booked
                ? "Update appointment"
                : "Confirm appointment"}
          </DitherButton>
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
  copy = "Pick an address, then a day and time. Times are IST.",
}: {
  jobTitle: string;
  title?: string;
  copy?: string;
}) {
  return (
    <>
      <AppPageTitle className="mb-2">{title}</AppPageTitle>
      <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
        {jobTitle}. {copy}
      </p>
    </>
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
