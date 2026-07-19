"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ExternalLinkIcon,
  PlusIcon,
  SearchIcon,
  UsersIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { OpportunityDetail } from "@/components/work/opportunity-detail";
import { AiInterview } from "@/components/candidate/interviews/ai-interview";
import { InterviewDeviceGate } from "@/components/candidate/interviews/interview-device-gate";
import { AppPage, APP_PAGE_GUTTER } from "@/components/layout/app-page";
import type { InterviewStageId } from "@/lib/interviews";
import type { ApplicationStatus } from "@/lib/jobs/applications";
import {
  OPPORTUNITY_TABS,
  OPPORTUNITY_TAB_LABELS,
  type Opportunity,
  type OpportunityTab,
} from "@/lib/opportunities";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const EXPLORE_SHELL_HEIGHT =
  "h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] md:h-dvh md:max-h-dvh";

const EXPLORE_LIST_SCROLL =
  "min-h-0 w-full flex-1 max-h-[calc(100dvh-4rem)] md:max-h-dvh";

const EXPLORE_GRID_SCROLL =
  "h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] md:h-dvh md:max-h-dvh";

const EXPLORE_DETAIL_SCROLL =
  "min-h-0 w-full flex-1 max-h-[calc(100dvh-4rem)] md:max-h-dvh";

const PRIORITY_OPTIONS = [
  { value: "all", label: "All priorities" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
] as const;

type WorkTypeFilter = "all" | OpportunityTab;

const WORK_TYPE_OPTIONS: { value: WorkTypeFilter; label: string }[] = [
  { value: "all", label: "All Types" },
  ...OPPORTUNITY_TABS.map((tab) => ({
    value: tab,
    label: OPPORTUNITY_TAB_LABELS[tab],
  })),
];

function OpportunityCard({
  opportunity,
  selected,
  compact,
  applicationStatus,
  onSelect,
}: {
  opportunity: Opportunity;
  selected: boolean;
  compact: boolean;
  applicationStatus?: ApplicationStatus | null;
  onSelect: () => void;
}) {
  const {
    title,
    pay,
    isNew,
    hiredThisMonth,
  } = opportunity;
  const hasApplied = Boolean(applicationStatus);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "bg-card flex cursor-pointer flex-col rounded-none border p-4 transition-colors",
        selected
          ? "border-primary ring-primary/20 border-2 ring-1"
          : "border-border hover:border-primary/40",
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3
          className={cn(
            "text-foreground leading-snug font-semibold",
            compact ? "text-sm" : "text-[15px]",
          )}
        >
          {title}
        </h3>
      </div>

      <p className={cn("text-muted-foreground", compact ? "text-xs" : "text-sm")}>
        {pay}
      </p>

      {hasApplied ? (
        <span className="text-muted-foreground mt-2 inline-flex items-center gap-1 text-xs font-medium">
          Applied
        </span>
      ) : selected && compact ? (
        <span className="text-primary mt-2 inline-flex items-center gap-1 text-xs font-medium">
          Apply
          <ExternalLinkIcon className="size-3" />
        </span>
      ) : null}

      <div className="border-border mt-3 flex items-center justify-between gap-2 border-t pt-3">
        <div className="text-muted-foreground flex min-w-0 items-center gap-2 text-xs">
          {isNew ? (
            <>
              <PlusIcon className="size-3.5 shrink-0" />
              <span className="truncate">New opportunity</span>
            </>
          ) : hiredThisMonth ? (
            <>
              <UsersIcon className="size-3.5 shrink-0" />
              <span className="truncate">{hiredThisMonth} hired this month</span>
            </>
          ) : (
            <>
              <UsersIcon className="size-3.5 shrink-0" />
              <span>Open role</span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function OpportunityCardSkeleton() {
  return (
    <div className="border-border bg-card flex flex-col rounded-none border p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-3 w-2/5" />
      <div className="border-border mt-3 flex items-center justify-between gap-2 border-t pt-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-10" />
      </div>
    </div>
  );
}

function ExploreFilters({
  search,
  onSearchChange,
  priority,
  onPriorityChange,
  workType,
  onWorkTypeChange,
  compact,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  priority: "all" | "high" | "medium" | "low";
  onPriorityChange: (value: "all" | "high" | "medium" | "low") => void;
  workType: WorkTypeFilter;
  onWorkTypeChange: (value: WorkTypeFilter) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "shrink-0",
        compact
          ? "space-y-2 pb-4"
          : "mb-8 flex flex-col gap-3 lg:flex-row lg:items-center",
      )}
    >
      <div className={cn("relative", compact ? "w-full" : "flex-1")}>
        <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search opportunities..."
          className="pl-8"
        />
      </div>
      <div className={cn("flex items-center gap-2", compact && "w-full")}>
        <Select
          value={priority}
          onValueChange={(value) =>
            onPriorityChange(value as "all" | "high" | "medium" | "low")
          }
        >
          <SelectTrigger className={cn(compact ? "flex-1" : "w-[160px]")}>
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={workType}
          onValueChange={(value) => onWorkTypeChange(value as WorkTypeFilter)}
        >
          <SelectTrigger className={cn(compact ? "flex-1" : "w-[180px]")}>
            <SelectValue placeholder="Work type" />
          </SelectTrigger>
          <SelectContent>
            {WORK_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function ExploreOpportunities({
  initialOpportunities = [],
  initialApplicationStatuses = {},
  initialProfileComplete = false,
  initialKycVerified = false,
  initialJobId = null,
}: {
  initialOpportunities?: Opportunity[];
  initialApplicationStatuses?: Record<string, ApplicationStatus>;
  initialProfileComplete?: boolean;
  initialKycVerified?: boolean;
  /** Deep-link from home / other pages: open this job in the detail panel. */
  initialJobId?: string | null;
} = {}) {
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState<"all" | "high" | "medium" | "low">(
    "all",
  );
  const [workType, setWorkType] = useState<WorkTypeFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialJobId ?? null,
  );
  const [opportunities, setOpportunities] =
    useState<Opportunity[]>(initialOpportunities);
  const [applicationStatuses, setApplicationStatuses] = useState<
    Record<string, ApplicationStatus>
  >(initialApplicationStatuses);
  const [profileComplete, setProfileComplete] = useState(
    initialProfileComplete,
  );
  const [kycVerified, setKycVerified] = useState(initialKycVerified);
  const [applying, setApplying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [startingInterview, setStartingInterview] = useState(false);
  const [showDeviceGate, setShowDeviceGate] = useState(false);
  const [activeInterview, setActiveInterview] = useState<{
    interviewId: string;
    jobId: string;
    jobTitle: string;
    stageId: InterviewStageId;
  } | null>(null);
  const isMobile = useIsMobile();
  /** Skip the first fetch — the server already seeded the default view. */
  const seededDefault = useRef(true);
  /** Skip clearing selection on the initial workType mount. */
  const workTypeReady = useRef(false);

  useEffect(() => {
    if (
      seededDefault.current &&
      workType === "all" &&
      !search &&
      priority === "all"
    ) {
      seededDefault.current = false;
      return;
    }
    seededDefault.current = false;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setFetchError("");
      try {
        const params = new URLSearchParams({
          scope: "public",
          page: "1",
          limit: "50",
        });
        if (workType !== "all") params.set("tab", workType);
        if (search.trim()) params.set("search", search.trim());
        if (priority !== "all") params.set("priority", priority);

        const res = await fetch(`/api/jobs?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Failed to load opportunities");
        const json = (await res.json()) as {
          items: Opportunity[];
          applicationStatuses?: Record<string, ApplicationStatus>;
          appliedJobIds?: string[];
          profileComplete?: boolean;
          kycVerified?: boolean;
        };
        setOpportunities(json.items ?? []);
        if (json.applicationStatuses) {
          setApplicationStatuses(json.applicationStatuses);
        } else if (json.appliedJobIds) {
          const next: Record<string, ApplicationStatus> = {};
          for (const id of json.appliedJobIds) next[id] = "applied";
          setApplicationStatuses(next);
        } else {
          setApplicationStatuses({});
        }
        if (typeof json.profileComplete === "boolean") {
          setProfileComplete(json.profileComplete);
        }
        if (typeof json.kycVerified === "boolean") {
          setKycVerified(json.kycVerified);
        }
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") return;
        setFetchError("Could not load opportunities. Try again.");
        setOpportunities([]);
      } finally {
        setLoading(false);
      }
    }, search ? 300 : 0);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [workType, search, priority]);

  const applyToJob = async (jobId: string) => {
    setApplying(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/apply`, { method: "POST" });
      if (!res.ok) throw new Error("apply failed");
      setApplicationStatuses((prev) => ({ ...prev, [jobId]: "applied" }));
    } catch {
      // surfaced via button state; safe to retry
    } finally {
      setApplying(false);
    }
  };

  const startInterview = async (
    opportunity: Opportunity,
    stageId: InterviewStageId,
  ) => {
    if (isMobile) {
      setShowDeviceGate(true);
      return;
    }

    setStartingInterview(true);
    try {
      const res = await fetch("/api/interviews/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: opportunity.id,
          stageId,
        }),
      });
      const data = (await res.json()) as {
        interviewId?: string;
        alreadyComplete?: boolean;
        error?: string;
      };
      if (!res.ok || !data.interviewId) {
        throw new Error(data.error || "Could not start interview");
      }
      if (data.alreadyComplete) {
        markInterviewComplete(opportunity.id, stageId);
        return;
      }
      setActiveInterview({
        interviewId: data.interviewId,
        jobId: opportunity.id,
        jobTitle: opportunity.title,
        stageId,
      });
    } catch {
      // keep CTA available for retry
    } finally {
      setStartingInterview(false);
    }
  };

  const markInterviewComplete = (
    jobId: string,
    stageId: InterviewStageId,
  ) => {
    setOpportunities((prev) =>
      prev.map((o) => {
        if (o.id !== jobId) return o;
        return {
          ...o,
          applicationSteps: o.applicationSteps.map((s) =>
            s.id === stageId
              ? { ...s, status: "done" as const, detail: "Completed" }
              : s,
          ),
        };
      }),
    );
  };

  const selectedIndex = useMemo(
    () => opportunities.findIndex((item) => item.id === selectedId),
    [opportunities, selectedId],
  );

  const selectedOpportunity =
    selectedIndex >= 0 ? opportunities[selectedIndex] : null;

  const hasSelection = selectedOpportunity !== null;
  const hasPrevious = selectedIndex > 0;
  const hasNext =
    selectedIndex >= 0 && selectedIndex < opportunities.length - 1;

  const goToPrevious = () => {
    if (!hasPrevious) return;
    setSelectedId(opportunities[selectedIndex - 1].id);
  };

  const goToNext = () => {
    if (!hasNext) return;
    setSelectedId(opportunities[selectedIndex + 1].id);
  };

  // Deep-link: server already pins the job into the seed list when possible.
  useEffect(() => {
    if (!initialJobId) return;
    setSelectedId(initialJobId);
  }, [initialJobId]);

  useEffect(() => {
    if (selectedId && !opportunities.some((item) => item.id === selectedId)) {
      setSelectedId(null);
    }
  }, [opportunities, selectedId]);

  useEffect(() => {
    if (!workTypeReady.current) {
      workTypeReady.current = true;
      return;
    }
    setSelectedId(null);
  }, [workType]);

  const emptyState = (
    <div className="border-border bg-card text-muted-foreground rounded-none border px-6 py-16 text-center text-sm">
      {fetchError ||
        "No published roles match your filters. Check back soon or try another filter."}
    </div>
  );

  const listSkeletons = (
    <div className="flex flex-col gap-3 pr-3 pb-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <OpportunityCardSkeleton key={i} />
      ))}
    </div>
  );

  const gridSkeletons = (
    <div className="grid gap-4 pb-6 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <OpportunityCardSkeleton key={i} />
      ))}
    </div>
  );

  const listHeader = (compact: boolean) => (
    <>
      <h1
        className={cn(
          "text-foreground shrink-0 font-semibold tracking-tight",
          compact ? "mb-4 text-xl md:text-2xl" : "mb-6 text-3xl md:text-4xl",
        )}
      >
        Explore opportunities
      </h1>

      <ExploreFilters
        search={search}
        onSearchChange={setSearch}
        priority={priority}
        onPriorityChange={setPriority}
        workType={workType}
        onWorkTypeChange={setWorkType}
        compact={compact}
      />
    </>
  );

  const cardItems = opportunities.map((opportunity) => (
    <OpportunityCard
      key={opportunity.id}
      opportunity={opportunity}
      selected={selectedId === opportunity.id}
      compact={hasSelection}
      applicationStatus={applicationStatuses[opportunity.id] ?? null}
      onSelect={() => setSelectedId(opportunity.id)}
    />
  ));

  const listBody = loading ? (
    listSkeletons
  ) : opportunities.length === 0 ? (
    emptyState
  ) : (
    <div className="flex flex-col gap-3 pr-3 pb-4">{cardItems}</div>
  );

  const gridBody = loading ? (
    gridSkeletons
  ) : opportunities.length === 0 ? (
    emptyState
  ) : (
    <div className="grid gap-4 pb-6 sm:grid-cols-2 xl:grid-cols-3">
      {cardItems}
    </div>
  );

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden",
        EXPLORE_SHELL_HEIGHT,
      )}
    >
      <div
        className={cn(
          "flex min-h-0 flex-1 overflow-hidden",
          hasSelection ? "flex-col lg:flex-row" : "flex-col",
        )}
      >
        <section
          className={cn(
            "flex min-h-0 flex-col overflow-hidden",
            EXPLORE_SHELL_HEIGHT,
            hasSelection
              ? "hidden w-full shrink-0 lg:flex lg:w-88 lg:max-w-md lg:border-r lg:border-border xl:w-96"
              : "w-full",
          )}
        >
          {hasSelection ? (
            <div className="flex h-full min-h-0 flex-col px-4 py-5 md:px-5">
              {listHeader(true)}
              {loading || opportunities.length === 0 ? (
                <div className="min-h-0 flex-1 overflow-hidden">{listBody}</div>
              ) : (
                <ScrollArea className={EXPLORE_LIST_SCROLL}>{listBody}</ScrollArea>
              )}
            </div>
          ) : (
            <ScrollArea className={EXPLORE_GRID_SCROLL}>
              <div className={cn(APP_PAGE_GUTTER, "py-6 md:py-8")}>
                <AppPage>
                  {listHeader(false)}
                  {gridBody}
                </AppPage>
              </div>
            </ScrollArea>
          )}
        </section>

        {hasSelection && selectedOpportunity ? (
          <section
            className={cn(
              "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
              EXPLORE_SHELL_HEIGHT,
            )}
          >
            <OpportunityDetail
              opportunity={selectedOpportunity}
              onClose={() => setSelectedId(null)}
              onPrevious={goToPrevious}
              onNext={goToNext}
              hasPrevious={hasPrevious}
              hasNext={hasNext}
              applicationStatus={
                applicationStatuses[selectedOpportunity.id] ?? null
              }
              applying={applying}
              profileComplete={profileComplete}
              kycVerified={kycVerified}
              startingInterview={startingInterview}
              onApply={() => applyToJob(selectedOpportunity.id)}
              onStartCommunicationInterview={() =>
                void startInterview(selectedOpportunity, "ai-communication")
              }
              onStartDomainInterview={() =>
                void startInterview(selectedOpportunity, "ai-domain")
              }
              scrollClassName={EXPLORE_DETAIL_SCROLL}
            />
          </section>
        ) : null}
      </div>

      {showDeviceGate ? (
        <InterviewDeviceGate onClose={() => setShowDeviceGate(false)} />
      ) : null}

      {activeInterview ? (
        <AiInterview
          interviewId={activeInterview.interviewId}
          jobTitle={activeInterview.jobTitle}
          stageId={activeInterview.stageId}
          onClose={() => setActiveInterview(null)}
          onCompleted={() => {
            markInterviewComplete(
              activeInterview.jobId,
              activeInterview.stageId,
            );
            setActiveInterview(null);
          }}
        />
      ) : null}
    </div>
  );
}
