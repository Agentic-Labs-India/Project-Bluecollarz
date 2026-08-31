import { Suspense } from "react";
import { AdminShell } from "@/app/(software)/admin/admin-shell";
import {
  AdminHubPageSkeleton,
  AppShellMainFrame,
} from "@/components/layout/page-skeleton";
import { requirePageProfile } from "@/lib/auth/session";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <AppShellMainFrame>
          <AdminHubPageSkeleton />
        </AppShellMainFrame>
      }
    >
      <AdminAuthGate>{children}</AdminAuthGate>
    </Suspense>
  );
}

async function AdminAuthGate({ children }: { children: React.ReactNode }) {
  await requirePageProfile("admin");
  return <AdminShell>{children}</AdminShell>;
}
