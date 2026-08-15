"use client";

import React, { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PlatformTermsGate } from "@/components/compliance/platform-terms-gate";
import { HIRE_NAV } from "@/lib/core/routes";

export function HireShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AppShell
        items={HIRE_NAV}
        homeHref="/hire/roles"
        profileHref="/hire/profile"
      >
        {children}
        <PlatformTermsGate />
      </AppShell>
    </Suspense>
  );
}
