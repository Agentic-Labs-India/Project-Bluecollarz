"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { AppRailSidebar } from "@/components/layout/app-rail-sidebar";
import { AppBottomNav } from "@/components/layout/app-bottom-nav";
import { AppTopBar } from "@/components/layout/app-top-bar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { AppNavItem } from "@/lib/routes";

/**
 * Shared application shell: desktop icon-rail sidebar, mobile top logo bar,
 * and mobile bottom navigation. Each profile passes its own nav config.
 */
export function AppShell({
  items,
  homeHref,
  profileHref,
  isFullBleed,
  children,
}: {
  items: AppNavItem[];
  homeHref: string;
  profileHref: string;
  /** Routes that own the full viewport (e.g. chat / split views). */
  isFullBleed?: (pathname: string) => boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const fullBleed = isFullBleed?.(pathname) ?? false;

  return (
    <SidebarProvider
      defaultOpen
      className="w-full max-w-full overflow-x-hidden"
      style={{ "--sidebar-width": "4.75rem" } as React.CSSProperties}
    >
      <AppRailSidebar
        items={items}
        homeHref={homeHref}
        profileHref={profileHref}
      />
      <SidebarInset className="bg-background flex min-h-svh w-full min-w-0 max-w-full flex-1 flex-col overflow-x-hidden">
        <AppTopBar homeHref={homeHref} profileHref={profileHref} />
        <main
          className={cn(
            "flex w-full min-h-0 min-w-0 max-w-full flex-1 flex-col",
            fullBleed
              ? "h-[calc(100dvh-3.5rem-4rem)] max-h-[calc(100dvh-3.5rem-4rem)] overflow-hidden p-0 pt-14 md:h-dvh md:max-h-dvh md:pt-0"
              : "p-4 pt-[calc(3.5rem+1rem)] pb-24 md:p-8 lg:p-10",
          )}
        >
          {children}
        </main>
        <AppBottomNav items={items} />
      </SidebarInset>
    </SidebarProvider>
  );
}
