import { Suspense } from "react";
import { HireShell } from "@/app/(software)/hire/hire-shell";
import { TablePageSkeleton } from "@/components/layout/page-skeleton";
import { requirePageProfile } from "@/lib/auth/session";

/**
 * Hire area: only `hire` profiles. Others are sent to their home.
 * Onboarding lives outside `(app)/layout.tsx` so it stays reachable
 * while the rest of the hire app is locked.
 */
export default function HireLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<TablePageSkeleton />}>
      <HireAuthGate>{children}</HireAuthGate>
    </Suspense>
  );
}

async function HireAuthGate({ children }: { children: React.ReactNode }) {
  await requirePageProfile("hire");
  return <HireShell>{children}</HireShell>;
}
