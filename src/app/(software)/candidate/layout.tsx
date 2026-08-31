import { Suspense } from "react";
import { CandidateShell } from "@/app/(software)/candidate/candidate-shell";
import {
  AppShellMainFrame,
  HomePageSkeleton,
} from "@/components/layout/page-skeleton";
import { requirePageProfile } from "@/lib/auth/session";

/**
 * Candidate area: only `work` profiles. Hire profiles are sent to their home.
 * Onboarding and KYC live outside `(app)/layout.tsx` so those
 * steps stay reachable while the rest of the app is locked.
 */
export default function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <AppShellMainFrame>
          <HomePageSkeleton />
        </AppShellMainFrame>
      }
    >
      <CandidateAuthGate>{children}</CandidateAuthGate>
    </Suspense>
  );
}

async function CandidateAuthGate({ children }: { children: React.ReactNode }) {
  await requirePageProfile("work");
  return <CandidateShell>{children}</CandidateShell>;
}
