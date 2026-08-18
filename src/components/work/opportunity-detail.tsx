"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  MapPinIcon,
  Maximize2Icon,
  Minimize2Icon,
  PartyPopperIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PrimaryDither } from "@/components/landing/primary-dither";
import { APP_PAGE_GUTTER, AppPage } from "@/components/layout/app-page";
import { Button } from "@/components/ui/button";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ApplicationStageStepper } from "@/components/work/application-stage-stepper";
import { PartyBurst } from "@/components/work/party-burst";
import { formatJobPlaceLabel } from "@/lib/core/geo/places";
import { resolveOpportunityCta } from "@/lib/interviews/cta";
import { JOB_LOCATION_LABELS, type JobLocation } from "@/lib/jobs";
import type { ApplicationStatus } from "@/lib/jobs/applications";
import type { Opportunity } from "@/lib/jobs/opportunities";
import { buildCandidatePipeline } from "@/lib/jobs/pipeline";
import { formatMedicalDateTime } from "@/lib/medical/time";
import {
  type CandidateMedicalAppointment,
  medicalPipelineFromAppointment,
} from "@/lib/medical/types";
import { cn } from "@/lib/utils";

export function OpportunityDetail({
  opportunity,
  onClose,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  applicationStatus,
  applying,
  profileComplete,
  startingInterview,
  onApply,
  onStartCommunicationInterview,
  onStartDomainInterview,
  onStartCustomQuestions,
  scrollClassName,
  className,
}: {
  opportunity: Opportunity;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  applicationStatus?: ApplicationStatus | null;
  applying?: boolean;
  profileComplete?: boolean;
  startingInterview?: boolean;
  onApply?: () => void;
  onStartCommunicationInterview?: () => void;
  onStartDomainInterview?: () => void;
  onStartCustomQuestions?: () => void;
  scrollClassName?: string;
  className?: string;
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [medicalAppointment, setMedicalAppointment] =
    useState<CandidateMedicalAppointment | null>(null);
  const [medicalLoading, setMedicalLoading] = useState(
    applicationStatus === "selected",
  );
  const medicalStatus = medicalPipelineFromAppointment(
    medicalAppointment?.status,
  );
  const medicalClosed = medicalStatus === "failed";
  const medicalDone = medicalStatus === "completed";
  const cta = resolveOpportunityCta({
    opportunity,
    profileComplete: profileComplete === true,
    applicationStatus: applicationStatus ?? null,
  });
  const steps = buildCandidatePipeline({
    stageIds: opportunity.applicationSteps.map((step) => step.id),
    profileComplete,
    completedStageIds: opportunity.applicationSteps
      .filter((step) => step.status === "done")
      .map((step) => step.id),
    applicationStatus,
    medicalStatus,
  });

  useEffect(() => {
    if (applicationStatus !== "selected") {
      setMedicalAppointment(null);
      setMedicalLoading(false);
      return;
    }
    let cancelled = false;
    setMedicalLoading(true);
    void fetch(
      `/api/candidate/medical-appointments?jobId=${encodeURIComponent(opportunity.id)}`,
    )
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as {
          items?: CandidateMedicalAppointment[];
        };
        if (cancelled || !res.ok) return;
        setMedicalAppointment(json.items?.[0] ?? null);
      })
      .catch(() => {
        if (!cancelled) setMedicalAppointment(null);
      })
      .finally(() => {
        if (!cancelled) setMedicalLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applicationStatus, opportunity.id]);

  useEffect(() => {
    const syncFullscreen = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", syncFullscreen);
    return () =>
      document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Browser blocked fullscreen (permissions, unsupported context, etc.)
    }
  }, []);

  return (
    <aside
      className={cn(
        "bg-background relative flex h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] w-full flex-col overflow-hidden md:h-dvh md:max-h-dvh",
        className,
      )}
    >
      {cta.type === "selected" && !medicalClosed ? (
        <PartyBurst shower />
      ) : null}
      <header className="border-border/60 shrink-0 border-b">
        <div className={cn(APP_PAGE_GUTTER, "py-3")}>
          <AppPage className="flex items-center justify-between">
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground lg:hidden"
                onClick={onClose}
                aria-label="Back to list"
              >
                <ChevronLeftIcon className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hidden lg:inline-flex"
                onClick={onClose}
                aria-label="Collapse panel"
              >
                <ChevronsLeftIcon className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground"
                onClick={onPrevious}
                disabled={!hasPrevious}
                aria-label="Previous opportunity"
              >
                <ChevronLeftIcon className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground"
                onClick={onNext}
                disabled={!hasNext}
                aria-label="Next opportunity"
              >
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              onClick={() => void toggleFullscreen()}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2Icon className="size-4" />
              ) : (
                <Maximize2Icon className="size-4" />
              )}
            </Button>
          </AppPage>
        </div>
      </header>

      <ScrollArea
        className={cn(
          "min-h-0 w-full flex-1 max-h-[calc(100dvh-4rem)] md:max-h-dvh",
          scrollClassName,
        )}
      >
        <div className={cn(APP_PAGE_GUTTER, "py-5 md:py-8")}>
          <AppPage>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <h2 className="text-foreground text-2xl font-semibold tracking-tight md:text-3xl">
                {opportunity.title}
              </h2>
              <p className="text-foreground shrink-0 text-lg font-medium md:text-xl">
                {opportunity.pay}
              </p>
            </div>

            <div className="text-muted-foreground mb-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              {opportunity.location ||
              opportunity.countryCode ||
              opportunity.stateCode ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPinIcon className="size-4 shrink-0" />
                  {formatJobPlaceLabel({
                    location: opportunity.location,
                    countryCode: opportunity.countryCode,
                    stateCode: opportunity.stateCode,
                    locationLabel: opportunity.location
                      ? JOB_LOCATION_LABELS[opportunity.location as JobLocation]
                      : undefined,
                  })}
                </span>
              ) : null}
            </div>

            {cta.type === "rejected" ? (
              <section className="border-border/80 bg-card mb-6 rounded-none border p-5 shadow-sm">
                <p className="text-foreground text-sm font-semibold">
                  Status: Rejected
                </p>
                <p className="text-muted-foreground mt-2 mb-4 text-sm leading-relaxed">
                  We are really sorry — you were genuinely good. Please apply to
                  other open roles; you can definitely get in elsewhere.
                </p>
                <ApplicationStageStepper steps={steps} />
              </section>
            ) : cta.type === "selected" && medicalClosed ? (
              <section className="border-border/80 bg-card mb-6 rounded-none border p-5 shadow-sm">
                <p className="text-foreground text-sm font-semibold">
                  Thank you for showing interest
                </p>
                <p className="text-muted-foreground mt-2 mb-4 text-sm leading-relaxed">
                  You can continue with other opportunities.
                </p>
                <ApplicationStageStepper steps={steps} />
              </section>
            ) : cta.type === "selected" ? (
              <section className="bg-primary relative mb-6 overflow-hidden border border-white/15 p-5">
                <PrimaryDither
                  seed={`selected-${opportunity.id}`}
                  opacity={0.85}
                />
                <div className="relative z-10">
                  <p className="flex items-center gap-2 text-sm font-semibold text-white">
                    <PartyPopperIcon className="size-4 shrink-0" />
                    {medicalDone ? "Status: Offer letter" : "Status: Selected"}
                  </p>
                  <div className="mt-4">
                    <ApplicationStageStepper steps={steps} variant="dither" />
                  </div>
                </div>
              </section>
            ) : (
              <section className="border-border/80 bg-card mb-6 rounded-none border p-5 shadow-sm">
                <p className="text-foreground mb-4 text-sm font-semibold">
                  Application
                </p>
                <ApplicationStageStepper steps={steps} />
              </section>
            )}

            <section className="pb-6">
              <h3 className="text-foreground mb-3 text-base font-semibold">
                Overview
              </h3>
              <RichTextContent html={opportunity.overview} />
            </section>
          </AppPage>
        </div>
      </ScrollArea>

      <footer className="border-border bg-background shrink-0 border-t">
        <div className={cn(APP_PAGE_GUTTER, "py-4")}>
          <AppPage>
            {cta.type === "rejected" ? (
              <div className="space-y-1">
                <p className="text-foreground text-sm font-medium">
                  Application not selected
                </p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  We are really sorry — you were genuinely good, and we
                  encourage you to apply to other positions. You can definitely
                  get in elsewhere.
                </p>
              </div>
            ) : cta.type === "selected" && medicalClosed ? (
              <div className="space-y-3">
                <p className="text-foreground text-sm font-medium">
                  Thank you for showing interest
                </p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  You can continue with other opportunities.
                </p>
                <Button asChild className="w-full" size="lg">
                  <Link href="/candidate/explore">See other opportunities</Link>
                </Button>
              </div>
            ) : cta.type === "selected" ? (
              <div className="relative z-20 space-y-1">
                <p className="text-foreground flex items-center gap-2 text-sm font-medium">
                  <PartyPopperIcon className="text-primary size-4 shrink-0" />
                  {medicalDone ? "Get offer letter" : "You're selected"}
                </p>
                {medicalLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full max-w-sm" />
                    <Skeleton className="h-11 w-full sm:w-48" />
                  </div>
                ) : medicalDone ? (
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Medical fitness is complete. Your next step is the offer
                    letter.
                  </p>
                ) : medicalAppointment?.status === "scheduled" ? (
                  <div className="space-y-3">
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Medical fitness appointment:{" "}
                      {formatMedicalDateTime(medicalAppointment.scheduledAt)}{" "}
                      IST at {medicalAppointment.center.name}.
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button asChild size="lg" variant="outline">
                        <a
                          href={medicalAppointment.center.directionsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <MapPinIcon className="size-3.5" />
                          Get directions
                        </a>
                      </Button>
                      <Button asChild size="lg">
                        <Link
                          href={`/candidate/medical?jobId=${encodeURIComponent(opportunity.id)}`}
                        >
                          Reschedule
                        </Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Schedule your medical fitness test to continue.
                    </p>
                    <Button asChild className="w-full" size="lg">
                      <Link
                        href={`/candidate/medical?jobId=${encodeURIComponent(opportunity.id)}`}
                      >
                        Schedule Medical Test
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            ) : cta.type === "profile" ? (
              <Button asChild className="w-full" size="lg" variant="default">
                <Link href="/candidate/profile">Update profile first</Link>
              </Button>
            ) : cta.type === "communication" ? (
              <Button
                className="w-full"
                size="lg"
                disabled={startingInterview}
                onClick={onStartCommunicationInterview}
              >
                {startingInterview
                  ? "Starting…"
                  : "Start AI Interview (Communication)"}
              </Button>
            ) : cta.type === "domain" ? (
              <Button
                className="w-full"
                size="lg"
                disabled={startingInterview}
                onClick={onStartDomainInterview}
              >
                {startingInterview
                  ? "Starting…"
                  : "Start AI Interview (Domain)"}
              </Button>
            ) : cta.type === "custom_questions" ? (
              <Button
                className="w-full"
                size="lg"
                disabled={startingInterview}
                onClick={onStartCustomQuestions}
              >
                {startingInterview ? "Starting…" : "Answer custom questions"}
              </Button>
            ) : (
              <Button
                className="w-full"
                size="lg"
                disabled={cta.type === "applied" || applying}
                onClick={onApply}
              >
                {cta.type === "applied"
                  ? "Applied"
                  : applying
                    ? "Applying…"
                    : "Apply now"}
              </Button>
            )}
          </AppPage>
        </div>
      </footer>
    </aside>
  );
}
