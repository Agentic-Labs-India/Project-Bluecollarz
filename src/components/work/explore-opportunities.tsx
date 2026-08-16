"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { PrimaryDitherBand } from "@/components/landing/primary-dither";
import { OpportunityDetail } from "@/components/work/opportunity-detail";
import { AiInterview } from "@/components/candidate/interviews/ai-interview";
import { CustomQuestionsForm } from "@/components/candidate/interviews/custom-questions-form";
import { InterviewDeviceGate } from "@/components/candidate/interviews/interview-device-gate";
import { AppPage, APP_PAGE_GUTTER } from "@/components/layout/app-page";
import { isAiInterviewStage, type InterviewStageId } from "@/lib/interviews";
import type { ApplicationStatus } from "@/lib/jobs/applications";
import type { CustomQuestion } from "@/lib/jobs/custom-questions";
import {
  OPPORTUNITY_TABS,
  OPPORTUNITY_TAB_LABELS,
  type Opportunity,
  type OpportunityTab,
} from "@/lib/jobs/opportunities";
import { stateName } from "@/lib/core/geo/places";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

function isJobId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

const EXPLORE_SHELL_HEIGHT =
  "h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] md:h-dvh md:max-h-dvh";

const EXPLORE_LIST_SCROLL =
  "min-h-0 w-full flex-1 max-h-[calc(100dvh-4rem)] md:max-h-dvh";

const EXPLORE_GRID_SCROLL =
  "h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] md:h-dvh md:max-h-dvh";

const EXPLORE_DETAIL_SCROLL =
  "min-h-0 w-full flex-1 max-h-[calc(100dvh-4rem)] md:max-h-dvh";

const EXPLORE_PAGE_SIZE = 12;
const EXPLORE_SEARCH_DEBOUNCE_MS = 500;

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
  const { title, pay, isNew, countryCode, stateCode } = opportunity;
  const hasApplied = Boolean(applicationStatus);
  const statusLabel =
    applicationStatus === "selected"
      ? "Selected"
      : applicationStatus === "rejected"
        ? "Rejected"
        : hasApplied
          ? "Applied 👍"
          : null;

  const bandLabel = stateName(countryCode, stateCode);

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
        "group bg-card flex w-full cursor-pointer flex-col overflow-hidden border transition-colors",
        selected
          ? "border-primary ring-primary/20 ring-1"
          : "border-border hover:border-primary/40",
      )}
    >
      <PrimaryDitherBand seed={opportunity.id} label={bandLabel || undefined} />

      <div
        className={cn(
          "flex flex-1 flex-col justify-between",
          compact ? "px-3 py-2.5" : "px-3.5 py-3",
        )}
      >
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3
              className={cn(
                "font-heading text-foreground min-w-0 line-clamp-1 font-semibold tracking-tight",
                compact ? "text-sm" : "text-[15px]",
              )}
            >
              {title}
            </h3>
            {statusLabel ? (
              <span className="text-muted-foreground shrink-0 text-[10px] font-medium tracking-wide uppercase">
                {statusLabel}
              </span>
            ) : isNew ? (
              <span className="text-primary shrink-0 text-[10px] font-semibold tracking-wide uppercase">
                New
              </span>
            ) : null}
          </div>
          <p
            className={cn(
              "text-muted-foreground mt-0.5 font-medium tabular-nums",
              compact ? "text-[13px]" : "text-sm",
            )}
          >
            {pay}
          </p>
        </div>

        <div className="border-primary/10 text-primary mt-2 flex items-center justify-between gap-2 border-t pt-2 text-xs font-semibold tracking-wide uppercase">
          <span>{hasApplied ? "View application" : "Apply now"}</span>
          <ArrowUpRightIcon
            className={cn(
              "size-3.5 shrink-0 transition-transform duration-200 ease-out",
              "group-hover:translate-x-0.5 group-hover:-translate-y-0.5",
            )}
          />
        </div>
      </div>
    </article>
  );
}

function OpportunityCardSkeleton() {
  return (
    <div className="border-border bg-card flex w-full flex-col overflow-hidden border">
      <Skeleton className="h-6 w-full" />
      <div className="flex flex-1 flex-col px-3.5 py-3">
        <div className="mb-1 flex items-start justify-between gap-2">
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-3 w-8" />
        </div>
        <Skeleton className="h-3.5 w-2/5" />
        <div className="border-border mt-2 flex items-center justify-between gap-2 border-t pt-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="size-3.5" />
        </div>
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
  page,
  pageCount,
  onPageChange,
  compact,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  priority: "all" | "high" | "medium" | "low";
  onPriorityChange: (value: "all" | "high" | "medium" | "low") => void;
  workType: WorkTypeFilter;
  onWorkTypeChange: (value: WorkTypeFilter) => void;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  compact?: boolean;
}) {
  const canPrev = page > 1;
  const canNext = page < pageCount;

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
          <SelectTrigger className={cn(compact ? "min-w-0 flex-1" : "w-[160px]")}>
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
          <SelectTrigger className={cn(compact ? "min-w-0 flex-1" : "w-[180px]")}>
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
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Previous page"
            disabled={!canPrev}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeftIcon />
          </Button>
          <span className="text-muted-foreground min-w-10 text-center text-xs tabular-nums">
            {page}/{pageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Next page"
            disabled={!canNext}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ExploreOpportunities({
  initialOpportunities = [],
  initialApplicationStatuses = {},
  initialProfileComplete = false,
  initialPageCount = 1,
  initialJobId = null,
}: {
  initialOpportunities?: Opportunity[];
  initialApplicationStatuses?: Record<string, ApplicationStatus>;
  initialProfileComplete?: boolean;
  initialPageCount?: number;
  /** Deep-link from home / other pages: open this job in the detail panel. */
  initialJobId?: string | null;
} = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const jobIdFromUrl = searchParams.get("jobId");
  /** URL is the source of truth for which job detail is open. */
  const selectedId =
    typeof jobIdFromUrl === "string" && isJobId(jobIdFromUrl)
      ? jobIdFromUrl
      : initialJobId && isJobId(initialJobId)
        ? initialJobId
        : null;

  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [priority, setPriority] = useState<"all" | "high" | "medium" | "low">(
    "all",
  );
  const [workType, setWorkType] = useState<WorkTypeFilter>("all");
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(Math.max(1, initialPageCount));
  const [opportunities, setOpportunities] =
    useState<Opportunity[]>(() =>
      initialOpportunities.slice(0, EXPLORE_PAGE_SIZE),
    );
  const [applicationStatuses, setApplicationStatuses] = useState<
    Record<string, ApplicationStatus>
  >(initialApplicationStatuses);
  const [profileComplete, setProfileComplete] = useState(
    initialProfileComplete,
  );
  const [applying, setApplying] = useState(false);
  const [justAppliedJobId, setJustAppliedJobId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [startingInterview, setStartingInterview] = useState(false);
  const [showDeviceGate, setShowDeviceGate] = useState(false);
  const [activeInterview, setActiveInterview] = useState<{
    interviewId: string;
    jobId: string;
    jobTitle: string;
    stageId: "ai-communication" | "ai-domain";
  } | null>(null);
  const [activeCustomForm, setActiveCustomForm] = useState<{
    interviewId: string;
    jobId: string;
    jobTitle: string;
    questions: CustomQuestion[];
  } | null>(null);
  const isMobile = useIsMobile();
  const skipInitialFetch = useRef(true);
  const prevWorkTypeRef = useRef(workType);
  const lastSeededJobId = useRef<string | null>(null);
  const pinFetchAttempted = useRef<string | null>(null);
  const queryKeyRef = useRef("all|all|");

  const selectJob = (id: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.get("jobId");
    if (id && current === id) return;
    if (!id && !current) return;
    if (id) params.set("jobId", id);
    else params.delete("jobId");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Adopt server-pinned seed when navigating in with a fresh ?jobId= (e.g. from home).
  useEffect(() => {
    if (!initialJobId) return;
    if (lastSeededJobId.current === initialJobId) return;
    lastSeededJobId.current = initialJobId;
    setOpportunities(initialOpportunities.slice(0, EXPLORE_PAGE_SIZE));
    setApplicationStatuses(initialApplicationStatuses);
    setProfileComplete(initialProfileComplete);
    setPage(1);
    setPageCount(Math.max(1, initialPageCount));
    skipInitialFetch.current = true;
    queryKeyRef.current = "all|all|";
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed keyed by initialJobId
  }, [initialJobId]);

  const applyJobsResponse = (json: {
    items?: Opportunity[];
    applicationStatuses?: Record<string, ApplicationStatus>;
    appliedJobIds?: string[];
    profileComplete?: boolean;
    pageCount?: number;
  }) => {
    setOpportunities((json.items ?? []).slice(0, EXPLORE_PAGE_SIZE));
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
    if (typeof json.pageCount === "number" && json.pageCount >= 1) {
      setPageCount(json.pageCount);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchDebounced(search.trim());
    }, EXPLORE_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const queryKey = `${workType}|${priority}|${searchDebounced}`;
    if (queryKeyRef.current !== queryKey) {
      queryKeyRef.current = queryKey;
      if (page !== 1) {
        setPage(1);
        return;
      }
    }

    const isDefaultQuery =
      workType === "all" &&
      !searchDebounced &&
      priority === "all" &&
      page === 1;

    if (isDefaultQuery && skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }
    skipInitialFetch.current = false;

    const controller = new AbortController();
    void (async () => {
      setLoading(true);
      setFetchError("");
      try {
        const params = new URLSearchParams({
          scope: "public",
          page: String(page),
          limit: String(EXPLORE_PAGE_SIZE),
        });
        if (workType !== "all") params.set("tab", workType);
        if (searchDebounced) params.set("search", searchDebounced);
        if (priority !== "all") params.set("priority", priority);

        const res = await fetch(`/api/jobs?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Failed to load opportunities");
        applyJobsResponse(
          (await res.json()) as Parameters<typeof applyJobsResponse>[0],
        );
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") return;
        setFetchError("Could not load opportunities. Try again.");
        setOpportunities([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [workType, searchDebounced, priority, page]);

  // Deep-link pin only on the default first page. Paginated/filtered pages
  // stay at 12 cards — close detail if the job is not on this page.
  useEffect(() => {
    if (!selectedId) {
      pinFetchAttempted.current = null;
      return;
    }
    if (loading) return;
    if (opportunities.some((item) => item.id === selectedId)) {
      pinFetchAttempted.current = selectedId;
      return;
    }

    const isDefaultFirstPage =
      page === 1 &&
      workType === "all" &&
      !searchDebounced &&
      priority === "all";

    if (!isDefaultFirstPage || pinFetchAttempted.current === selectedId) {
      selectJob(null);
      return;
    }
    pinFetchAttempted.current = selectedId;

    const controller = new AbortController();
    void (async () => {
      try {
        const params = new URLSearchParams({
          scope: "public",
          page: "1",
          limit: String(EXPLORE_PAGE_SIZE),
          pinJobId: selectedId,
        });
        const res = await fetch(`/api/jobs?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          selectJob(null);
          return;
        }
        applyJobsResponse(
          (await res.json()) as Parameters<typeof applyJobsResponse>[0],
        );
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") return;
        selectJob(null);
      }
    })();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pin keyed by selectedId + current page list
  }, [selectedId, opportunities, loading, page, workType, searchDebounced, priority]);

  const applyToJob = async (jobId: string) => {
    setApplying(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/apply`, { method: "POST" });
      if (!res.ok) throw new Error("apply failed");
      setApplicationStatuses((prev) => ({ ...prev, [jobId]: "applied" }));
      setJustAppliedJobId(jobId);
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
    if (isAiInterviewStage(stageId) && isMobile) {
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
        customQuestions?: CustomQuestion[];
      };
      if (!res.ok || !data.interviewId) {
        throw new Error(data.error || "Could not start interview");
      }
      if (data.alreadyComplete) {
        markInterviewComplete(opportunity.id, stageId);
        return;
      }

      if (stageId === "custom-questions") {
        const questions =
          data.customQuestions ?? opportunity.customQuestions ?? [];
        if (!questions.length) {
          throw new Error("This role has no custom questions configured.");
        }
        setActiveCustomForm({
          interviewId: data.interviewId,
          jobId: opportunity.id,
          jobTitle: opportunity.title,
          questions,
        });
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
    () =>
      selectedId
        ? opportunities.findIndex((item) => item.id === selectedId)
        : -1,
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
    selectJob(opportunities[selectedIndex - 1].id);
  };

  const goToNext = () => {
    if (!hasNext) return;
    selectJob(opportunities[selectedIndex + 1].id);
  };

  // Clear selection only when the user actually changes work type — never on
  // ?jobId= / searchParams updates (that was stripping the deep link).
  useEffect(() => {
    if (prevWorkTypeRef.current === workType) return;
    prevWorkTypeRef.current = workType;
    selectJob(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- workType is the only trigger
  }, [workType]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const emptyState = (
    <div className="border-border bg-card text-muted-foreground rounded-none border px-6 py-16 text-center text-sm">
      {fetchError ||
        "No published roles match your filters. Check back soon or try another filter."}
    </div>
  );

  const listSkeletons = (
    <div className="flex w-full flex-col gap-3 pb-4">
      {Array.from({ length: EXPLORE_PAGE_SIZE }).map((_, i) => (
        <OpportunityCardSkeleton key={i} />
      ))}
    </div>
  );

  const gridSkeletons = (
    <div className="grid gap-4 pb-6 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: EXPLORE_PAGE_SIZE }).map((_, i) => (
        <OpportunityCardSkeleton key={i} />
      ))}
    </div>
  );

  const listHeader = (compact: boolean) => (
    <>
      <h1
        className={cn(
          "text-foreground shrink-0 font-semibold tracking-tight",
          compact ? "mb-4 text-xl md:text-2xl" : "mb-6 text-2xl md:text-3xl",
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
        page={page}
        pageCount={pageCount}
        onPageChange={setPage}
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
      onSelect={() => selectJob(opportunity.id)}
    />
  ));

  const listBody = loading ? (
    listSkeletons
  ) : opportunities.length === 0 ? (
    emptyState
  ) : (
    <div className="flex w-full flex-col gap-3 pb-4">{cardItems}</div>
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
              onClose={() => selectJob(null)}
              onPrevious={goToPrevious}
              onNext={goToNext}
              hasPrevious={hasPrevious}
              hasNext={hasNext}
              applicationStatus={
                applicationStatuses[selectedOpportunity.id] ?? null
              }
              applying={applying}
              justApplied={justAppliedJobId === selectedOpportunity.id}
              profileComplete={profileComplete}
              startingInterview={startingInterview}
              onApply={() => applyToJob(selectedOpportunity.id)}
              onStartCommunicationInterview={() =>
                void startInterview(selectedOpportunity, "ai-communication")
              }
              onStartDomainInterview={() =>
                void startInterview(selectedOpportunity, "ai-domain")
              }
              onStartCustomQuestions={() =>
                void startInterview(selectedOpportunity, "custom-questions")
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

      {activeCustomForm ? (
        <CustomQuestionsForm
          interviewId={activeCustomForm.interviewId}
          jobTitle={activeCustomForm.jobTitle}
          questions={activeCustomForm.questions}
          onClose={() => setActiveCustomForm(null)}
          onComplete={() => {
            markInterviewComplete(activeCustomForm.jobId, "custom-questions");
            setActiveCustomForm(null);
          }}
        />
      ) : null}
    </div>
  );
}
