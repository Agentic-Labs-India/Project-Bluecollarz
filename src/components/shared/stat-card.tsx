import type { LucideIcon } from "lucide-react";
import { PrimaryDither } from "@/components/landing/primary-dither";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Compact metric card (icon + label + value) shared across dashboards. */
export function StatCard({
  icon: Icon,
  label,
  value,
  loading = false,
  className,
  variant = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  loading?: boolean;
  className?: string;
  variant?: "default" | "dither";
}) {
  if (variant === "dither") {
    return (
      <div
        className={cn(
          "bg-primary relative min-w-0 overflow-hidden border border-white/15 p-5",
          className,
        )}
      >
        <PrimaryDither seed={`stat-${label}`} opacity={0.85} />
        <div className="relative z-10">
          <Icon className="mb-3 size-5 text-white/90" />
          <p className="text-sm leading-snug break-words hyphens-none text-white/75">
            {label}
          </p>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-12 rounded-none bg-white/20" />
          ) : (
            <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-border/80 bg-card min-w-0 rounded-none border p-5 shadow-sm",
        className,
      )}
    >
      <Icon className="text-primary mb-3 size-5" />
      <p className="text-muted-foreground text-sm leading-snug break-words hyphens-none">
        {label}
      </p>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-12 rounded-none" />
      ) : (
        <p className="text-foreground mt-1 text-2xl font-semibold">{value}</p>
      )}
    </div>
  );
}
