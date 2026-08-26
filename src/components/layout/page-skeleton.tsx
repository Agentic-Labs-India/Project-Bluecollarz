import {
  APP_PAGE_MAX,
  APP_PAGE_PAD,
  AppPage,
} from "@/components/layout/app-page";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, placeholderKeys } from "@/lib/utils";

const EXPLORE_CARD_IDS = ["e1", "e2", "e3", "e4", "e5", "e6"] as const;
const HOME_ROW_IDS = ["r1", "r2", "r3"] as const;

/** Profile header + form fields skeleton. */
export function ProfilePageSkeleton() {
  return (
    <AppPage className="pb-10">
      <header className="mb-8">
        <Skeleton className="h-8 w-40 md:h-9" />
      </header>
      <div className="space-y-8">
        <div className="bg-primary relative flex flex-col items-start gap-5 overflow-hidden border border-white/15 p-6 sm:flex-row sm:items-center">
          <Skeleton className="size-20 shrink-0 rounded-full bg-white/20" />
          <div className="w-full space-y-2">
            <Skeleton className="h-5 w-40 bg-white/20" />
            <Skeleton className="h-4 w-56 bg-white/20" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {["f1", "f2", "f3", "f4", "f5", "f6"].map((id) => (
            <div key={id} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-10 w-32" />
      </div>
    </AppPage>
  );
}

/** Candidate home: greeting, stats, roles list, CTA. */
export function HomePageSkeleton() {
  return (
    <AppPage>
      <header className="mb-8">
        <Skeleton className="h-8 w-64 max-w-full md:h-9" />
      </header>
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        {["c1", "c2", "c3"].map((id) => (
          <div
            key={id}
            className="bg-primary min-w-0 overflow-hidden border border-white/15 p-5"
          >
            <Skeleton className="mb-3 size-5 bg-white/20" />
            <Skeleton className="h-4 w-24 bg-white/20" />
            <Skeleton className="mt-2 h-8 w-12 bg-white/20" />
          </div>
        ))}
      </div>
      <section className="border-border/80 bg-card mb-8 rounded-none border shadow-sm">
        <div className="border-border/60 border-b px-5 py-4">
          <Skeleton className="h-5 w-28" />
        </div>
        <ul className="divide-border/60 divide-y">
          {HOME_ROW_IDS.map((id) => (
            <li key={id} className="space-y-3 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-2 w-full" />
            </li>
          ))}
        </ul>
      </section>
      <section className="border-border/80 bg-card rounded-none border p-6 shadow-sm">
        <Skeleton className="mb-2 h-5 w-52" />
        <Skeleton className="mb-5 h-4 w-full max-w-md" />
        <Skeleton className="h-10 w-48 rounded-full" />
      </section>
    </AppPage>
  );
}

function ExploreCardSkeleton() {
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

/** Candidate explore: title, filters, opportunity cards. */
export function ExplorePageSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className={cn("min-h-0 flex-1 overflow-hidden", APP_PAGE_PAD)}>
        <AppPage>
          <header className="mb-8">
            <Skeleton className="h-8 w-64 max-w-full md:h-9" />
          </header>
          <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-center">
            <Skeleton className="h-9 w-full lg:flex-1" />
            <Skeleton className="h-9 w-full lg:w-40" />
            <Skeleton className="h-9 w-full lg:w-40" />
          </div>
          <div className="grid gap-4 pb-6 sm:grid-cols-2 xl:grid-cols-3">
            {EXPLORE_CARD_IDS.map((id) => (
              <ExploreCardSkeleton key={id} />
            ))}
          </div>
        </AppPage>
      </div>
    </div>
  );
}

/** Candidate settings: prefs, privacy, danger zone. */
export function SettingsPageSkeleton() {
  return (
    <AppPage>
      <header className="mb-8">
        <Skeleton className="h-8 w-36 md:h-9" />
      </header>
      <section className="border-border/80 bg-card divide-border/60 mb-6 divide-y overflow-hidden rounded-none border shadow-sm">
        <Skeleton className="h-6 w-full rounded-none" />
        <div className="flex items-center justify-between gap-4 p-5">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-56 max-w-full" />
          </div>
          <Skeleton className="h-9 w-40 shrink-0" />
        </div>
        <div className="flex items-center justify-between gap-4 p-5">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
          <Skeleton className="h-9 w-40 shrink-0" />
        </div>
      </section>
      <section className="border-border/80 bg-card mb-6 overflow-hidden rounded-none border shadow-sm">
        <Skeleton className="h-6 w-full rounded-none" />
        <div className="space-y-4 p-5">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </section>
      <section className="border-destructive/20 bg-card overflow-hidden rounded-none border shadow-sm">
        <Skeleton className="h-6 w-full rounded-none" />
        <div className="space-y-3 p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-full max-w-sm" />
          <Skeleton className="h-9 w-36" />
        </div>
      </section>
    </AppPage>
  );
}

/** KYC consent / verified-identity card skeleton. */
export function KycPageSkeleton() {
  return (
    <div
      className={cn(
        "mx-auto flex min-h-0 w-full flex-1 flex-col p-4 md:p-8 lg:p-10",
        APP_PAGE_MAX,
      )}
    >
      <div className="border-border flex min-h-0 flex-1 flex-col overflow-hidden border">
        <Skeleton className="h-6 w-full shrink-0 rounded-none" />
        <div className="min-h-0 flex-1 space-y-6 overflow-hidden p-6 sm:p-8">
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-24 w-full" />
          {["k1", "k2", "k3", "k4"].map((id) => (
            <div key={id} className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-5 w-8 shrink-0" />
            </div>
          ))}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Skeleton className="h-11 w-full sm:w-40" />
            <Skeleton className="h-11 w-full sm:w-64" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Candidate medical booking flow skeleton. */
export function MedicalPageSkeleton() {
  return (
    <AppPage>
      <header className="mb-8">
        <Skeleton className="h-8 w-64 max-w-full md:h-9" />
        <Skeleton className="mt-2 h-4 w-80 max-w-full" />
      </header>
      <div className="space-y-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-9 w-full" />
      </div>
      <div className="mt-8 grid gap-8 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <Skeleton className="h-72 w-full" />
        <div className="space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-48" />
          <div className="flex flex-wrap gap-2">
            {["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"].map((id) => (
              <Skeleton key={id} className="h-8 w-20" />
            ))}
          </div>
        </div>
      </div>
      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        <Skeleton className="h-11 w-full sm:w-48" />
        <Skeleton className="h-11 w-full sm:w-24" />
      </div>
    </AppPage>
  );
}

function PageTitleSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <header className="mb-8">
      <Skeleton
        className={cn("h-8 md:h-9", wide ? "w-64 max-w-full" : "w-40")}
      />
      <Skeleton className="mt-2 h-4 w-80 max-w-full" />
    </header>
  );
}

function TableRowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {placeholderKeys(rows).map((id) => (
        <Skeleton key={id} className="h-12 w-full" />
      ))}
    </div>
  );
}

/** Title + search/filters + table. Hire roles, admin support/blog. */
export function TablePageSkeleton() {
  return (
    <AppPage>
      <PageTitleSkeleton wide />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Skeleton className="h-9 w-full sm:max-w-xs" />
        <Skeleton className="h-9 w-full sm:w-32" />
        <Skeleton className="h-9 w-full sm:ml-auto sm:w-28" />
      </div>
      <TableRowsSkeleton />
    </AppPage>
  );
}

/** Header + tabs + rows. Used inside an existing AppPage. */
export function AdminHubSkeleton() {
  return (
    <>
      <PageTitleSkeleton wide />
      <div className="mb-6 flex flex-wrap gap-4">
        {placeholderKeys(3, "tab").map((id) => (
          <Skeleton key={id} className="h-8 w-20" />
        ))}
      </div>
      <TableRowsSkeleton />
    </>
  );
}

/** Full admin hub page (nav loading). */
export function AdminHubPageSkeleton() {
  return (
    <AppPage>
      <AdminHubSkeleton />
    </AppPage>
  );
}

/** Recruiter company profile. */
export function HireProfilePageSkeleton() {
  return (
    <AppPage>
      <PageTitleSkeleton wide />
      <div className="border-border/80 bg-card mb-6 border p-4 shadow-sm sm:p-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:gap-5">
          <Skeleton className="size-16 shrink-0 rounded-full sm:size-20" />
          <div className="w-full space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-5 w-28" />
          </div>
        </div>
        <div className="border-border/60 mt-6 grid gap-3 border-t pt-6 sm:grid-cols-2">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {placeholderKeys(3, "stat").map((id) => (
          <div key={id} className="border-border/80 bg-card border p-4 sm:p-5">
            <Skeleton className="mb-3 size-5" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-2 h-8 w-12" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <Skeleton className="h-48 w-full lg:col-span-2" />
        <Skeleton className="h-48 w-full lg:col-span-3" />
      </div>
    </AppPage>
  );
}

/** New role / hire onboarding form. */
export function FormPageSkeleton() {
  return (
    <AppPage>
      <Skeleton className="mb-4 h-8 w-28" />
      <PageTitleSkeleton />
      <div className="grid gap-4 sm:grid-cols-2">
        {placeholderKeys(6, "field").map((id) => (
          <div key={id} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-6 h-28 w-full" />
      <div className="mt-6 flex gap-2">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-24" />
      </div>
    </AppPage>
  );
}
