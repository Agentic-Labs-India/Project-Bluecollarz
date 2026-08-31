import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared content width for candidate, hire, and admin app pages (PC). */
export const APP_PAGE_MAX = "max-w-5xl";

/**
 * Horizontal gutters for full-bleed routes so they match AppShell padding
 * on normal pages: p-4 / md:p-8 / lg:p-10.
 */
export const APP_PAGE_GUTTER = "px-4 md:px-8 lg:px-10";

/** Same inset as AppShell pages (home, profile, settings). */
export const APP_PAGE_PAD = "p-4 md:p-8 lg:p-10";

/** Matches AppShell `<main>` padding for standard (non–full-bleed) routes. */
export const APP_SHELL_MAIN_CLASS = cn(
  APP_PAGE_PAD,
  "pt-[calc(3.5rem+1rem)] pb-24",
);

export const APP_PAGE_TITLE_CLASS =
  "font-heading text-foreground min-w-0 text-2xl leading-tight font-semibold tracking-tight md:text-3xl";

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

/** Page h1 — same size, type, and spacing on home, explore, profile, settings. */
export function AppPageTitle({
  children,
  className,
  trailing,
}: {
  children: ReactNode;
  className?: string;
  trailing?: ReactNode;
}) {
  return (
    <header
      className={cn(
        "mb-8 flex min-w-0 flex-wrap items-end justify-between gap-3",
        className,
      )}
    >
      <h1 className={APP_PAGE_TITLE_CLASS}>{children}</h1>
      {trailing}
    </header>
  );
}
