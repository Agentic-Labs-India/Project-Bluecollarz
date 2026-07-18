import { AppPage } from "@/components/layout/app-page";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Shared page-level loading placeholder (replaces spinner circles). */
export function PageSkeleton({
  className,
  rows = 4,
}: {
  className?: string;
  rows?: number;
}) {
  return (
    <AppPage className={cn("space-y-6 py-2", className)}>
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton
            key={i}
            className={cn("w-full", i % 2 === 0 ? "h-24" : "h-12")}
          />
        ))}
      </div>
    </AppPage>
  );
}

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

/** KYC upload page skeleton. */
export function KycPageSkeleton() {
  return (
    <AppPage className="space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>
      <div className="flex flex-col gap-3 md:flex-row">
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className="border-border w-full flex-1 space-y-3 border p-4"
          >
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-11 w-full" />
    </AppPage>
  );
}
