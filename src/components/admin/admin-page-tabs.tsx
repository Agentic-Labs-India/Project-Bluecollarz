"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { type ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

export type AdminPageTab<T extends string = string> = {
  value: T;
  label: string;
};

export function AdminHubHeader({
  title,
  description,
}: {
  title: string;
  description: ReactNode;
}) {
  return (
    <div className="mb-6">
      <h1 className="text-foreground text-2xl font-semibold tracking-tight md:text-3xl">
        {title}
      </h1>
      <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
        {description}
      </p>
    </div>
  );
}

/** Underline tab bar — same control as Email sending / receiving. */
export function AdminPageTabs<T extends string>({
  tabs,
  value,
  onValueChange,
  className,
}: {
  tabs: readonly AdminPageTab<T>[];
  value: T;
  onValueChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "border-border mb-6 flex flex-wrap gap-1 border-b",
        className,
      )}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onValueChange(tab.value)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
              active
                ? "border-primary text-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Tab from `?tab=` on first paint; later switches use history.replaceState
 * so the URL stays shareable without an RSC refetch.
 */
export function useAdminTab<T extends string>(
  tabs: readonly AdminPageTab<T>[],
  fallback: T,
): [T, (value: T) => void] {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get("tab");
  const initial = tabs.some((t) => t.value === fromUrl)
    ? (fromUrl as T)
    : fallback;
  const [tab, setTabState] = useState<T>(initial);

  const setTab = (next: T) => {
    setTabState(next);
    const url = next === fallback ? pathname : `${pathname}?tab=${next}`;
    window.history.replaceState(window.history.state, "", url);
  };

  return [tab, setTab];
}
