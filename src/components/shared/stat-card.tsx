import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Compact metric card (icon + label + value) shared across dashboards. */
export function StatCard({
  icon: Icon,
  label,
  value,
  loading = false,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  loading?: boolean;
  className?: string;
}) {
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
