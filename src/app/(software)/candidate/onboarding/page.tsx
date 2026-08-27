import { redirect } from "next/navigation";
import { Suspense } from "react";
import { OnboardingAgent } from "@/components/candidate/onboarding-agent";
import { KycPageSkeleton } from "@/components/layout/page-skeleton";
import { requirePageProfile } from "@/lib/auth/session";
import { getCandidateGateStatus } from "@/lib/candidate/queries";

export default function CandidateOnboardingPage() {
  return (
    <Suspense fallback={<KycPageSkeleton />}>
      <OnboardingPageGate />
    </Suspense>
  );
}

async function OnboardingPageGate() {
  const user = await requirePageProfile("work");
  const { complete, kycVerified } = await getCandidateGateStatus(user.id);
  if (complete) {
    redirect(kycVerified ? "/candidate/home" : "/candidate/kyc");
  }
  return <OnboardingAgent />;
}
