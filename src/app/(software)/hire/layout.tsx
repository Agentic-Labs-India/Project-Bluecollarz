"use client";

import React, { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { HIRE_NAV } from "@/lib/routes";

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
      >
        {children}
      </AppShell>
    </Suspense>
  );
}
