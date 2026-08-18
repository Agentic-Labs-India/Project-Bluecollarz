import { AppPage } from "@/components/layout/app-page";
import { Skeleton } from "@/components/ui/skeleton";

/** Profile header + form fields skeleton. */
export function ProfilePageSkeleton() {
  return (
    <AppPage className="space-y-8 pb-10">
      <Skeleton className="h-9 w-40" />
      <div className="border-border flex flex-col items-start gap-5 border p-6 sm:flex-row sm:items-center">
        <Skeleton className="size-20 shrink-0 rounded-full" />
        <div className="w-full space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
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
    </AppPage>
  );
}

/** KYC consent / verified-identity card skeleton. */
export function KycPageSkeleton() {
  return (
    <AppPage>
      <div className="border-border overflow-hidden border">
        <Skeleton className="h-6 w-full rounded-none" />
        <div className="space-y-6 p-6 sm:p-8">
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
    </AppPage>
  );
}

/** Candidate medical booking flow skeleton. */
export function MedicalPageSkeleton() {
  return (
    <AppPage>
      <header className="mb-6 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </header>
      <div className="space-y-3">
        {["c1", "c2", "c3"].map((id) => (
          <div key={id} className="border-border space-y-2 border p-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-56" />
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <Skeleton className="h-72 w-full" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-48" />
          <div className="flex flex-wrap gap-2">
            {["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"].map((id) => (
              <Skeleton key={id} className="h-8 w-20" />
            ))}
          </div>
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Skeleton className="h-11 w-full sm:w-48" />
        <Skeleton className="h-11 w-full sm:w-24" />
      </div>
    </AppPage>
  );
}
