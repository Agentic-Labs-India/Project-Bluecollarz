import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared content width for candidate + hire app pages (PC). */
export const APP_PAGE_MAX = "max-w-5xl";

/**
 * Horizontal gutters for full-bleed routes (explore, onboarding) so they
 * match AppShell padding on normal pages: p-4 / md:p-8 / lg:p-10.
 */
export const APP_PAGE_GUTTER = "px-4 md:px-8 lg:px-10";

/** Centered page body — same max width everywhere in the software app. */
export function AppPage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full min-w-0", APP_PAGE_MAX, className)}>
      {children}
    </div>
  );
}
