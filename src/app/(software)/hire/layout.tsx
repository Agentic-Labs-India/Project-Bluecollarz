"use client";

import React, { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { HIRE_NAV } from "@/lib/routes";

const isFullBleed = (pathname: string) =>
  pathname.startsWith("/hire/ai-agent");

export default function HireLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <AppShell
        items={HIRE_NAV}
        homeHref="/hire/roles"
        profileHref="/hire/profile"
        isFullBleed={isFullBleed}
      >
        {children}
      </AppShell>
    </Suspense>
  );
}
