"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ADMIN_NAV } from "@/lib/routes";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      items={ADMIN_NAV}
      homeHref="/admin/recruiters"
      profileHref="/admin/admins"
    >
      {children}
    </AppShell>
  );
}
