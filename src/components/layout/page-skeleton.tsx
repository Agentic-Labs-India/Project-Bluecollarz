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
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="space-y-2">
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
        <Skeleton className="h-1.5 w-full" />
        <div className="space-y-4 p-5">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-16 w-full" />
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-6 w-10 shrink-0" />
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
