"use client";

import type React from "react";
import { Suspense } from "react";
import { PlatformTermsGate } from "@/components/compliance/platform-terms-gate";
import { AppShell } from "@/components/layout/app-shell";
import { HIRE_NAV } from "@/lib/core/routes";

const isOnboarding = (pathname: string) =>
  pathname.startsWith("/hire/onboarding");

export function HireShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AppShell
        items={HIRE_NAV}
        homeHref="/hire/roles"
        profileHref="/hire/profile"
        hideMobileNav={isOnboarding}
      >
        {children}
        <PlatformTermsGate />
      </AppShell>
    </Suspense>
  );
}
