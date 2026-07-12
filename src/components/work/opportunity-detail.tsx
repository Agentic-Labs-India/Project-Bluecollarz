"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  CircleIcon,
  InfoIcon,
  MapPinIcon,
  Maximize2Icon,
  Minimize2Icon,
  UsersIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RichTextContent } from "@/components/ui/rich-text-content";
import type { Opportunity } from "@/lib/opportunities";
import { JOB_LOCATION_LABELS, type JobLocation } from "@/lib/jobs";
import { formatJobPlaceLabel } from "@/lib/geo/places";
import { resolveOpportunityCta } from "@/lib/interviews/cta";
import { cn } from "@/lib/utils";

function ApplicationProgress({
  steps,
}: {
  steps: Opportunity["applicationSteps"];
}) {
  const completed = steps.filter((step) => step.status === "done").length;
  const total = steps.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <section className="border-border/80 bg-card mb-6 rounded-none border shadow-sm">
      <div className="border-border/60 flex items-center justify-between border-b px-5 py-4">
        <h3 className="text-foreground text-sm font-semibold">Application</h3>
        <ChevronDownIcon className="text-muted-foreground size-4" />
      </div>

      <div className="px-5 py-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="text-muted-foreground text-xs">
            {completed} of {total} steps completed
          </span>
          <span className="text-foreground text-sm font-semibold tabular-nums">
            {percent}%
          </span>
        </div>

        <div className="bg-muted mb-5 h-2 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>

        <ul className="space-y-4">
          {steps.map((step) => (
            <li key={step.id} className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                  step.status === "done"
                    ? "bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground border bg-background",
                )}
              >
                {step.status === "done" ? (
                  <CheckIcon className="size-3" />
                ) : (
                  <CircleIcon className="size-3" />
                )}
              </span>
              <div className="min-w-0">
                <p className="text-foreground text-sm font-medium">{step.label}</p>
                <p className="text-muted-foreground text-xs">{step.detail}</p>
              </div>
            </li>
          ))}
        </ul>

          <div className="border-border/60 bg-muted/40 text-muted-foreground mt-5 flex gap-2 rounded-none border px-3 py-2.5 text-xs leading-relaxed">
          <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
          <p>
            Complete Resume first. When enabled by the hiring partner, finish AI
            interviews in order — then you can apply.
          </p>
        </div>
      </div>
    </section>
  );
}

export function OpportunityDetail({
  opportunity,
  onClose,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  applied,
  applying,
  profileComplete,
  startingInterview,
  onApply,
  onStartCommunicationInterview,
  onStartDomainInterview,
  scrollClassName,
  className,
}: {
  opportunity: Opportunity;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  applied?: boolean;
  applying?: boolean;
  profileComplete?: boolean;
  startingInterview?: boolean;
  onApply?: () => void;
  onStartCommunicationInterview?: () => void;
  onStartDomainInterview?: () => void;
  scrollClassName?: string;
  className?: string;
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const cta = resolveOpportunityCta({
    opportunity,
    profileComplete: profileComplete === true,
    applied: applied === true,
  });

  useEffect(() => {
    const syncFullscreen = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
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
        "bg-background flex h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] w-full flex-col overflow-hidden md:h-dvh md:max-h-dvh",
        className,
      )}
    >
      <header className="border-border/60 shrink-0 border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 md:px-6">
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
        </div>
      </header>

      <ScrollArea
        className={cn(
          "min-h-0 w-full flex-1 max-h-[calc(100dvh-4rem)] md:max-h-dvh",
          scrollClassName,
        )}
      >
        <div className="mx-auto w-full max-w-5xl px-4 py-5 md:px-6 md:py-8">
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
                    ? JOB_LOCATION_LABELS[
                        opportunity.location as JobLocation
                      ]
                    : undefined,
                })}
              </span>
            ) : null}
            {opportunity.hiredThisMonth ? (
              <span className="inline-flex items-center gap-1.5">
                <UsersIcon className="size-4 shrink-0" />
                {opportunity.hiredThisMonth} hired this month
              </span>
            ) : null}
          </div>

          <ApplicationProgress steps={opportunity.applicationSteps} />

          <section className="pb-6">
            <h3 className="text-foreground mb-3 text-base font-semibold">Overview</h3>
            <RichTextContent html={opportunity.overview} />
          </section>
        </div>
      </ScrollArea>

      <footer className="border-border bg-background shrink-0 border-t">
        <div className="mx-auto w-full max-w-5xl px-4 py-4 md:px-6">
          {cta.type === "profile" ? (
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
        </div>
      </footer>
    </aside>
  );
}
