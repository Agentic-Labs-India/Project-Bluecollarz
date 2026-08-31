import { redirect } from "next/navigation";
import { OnboardingAgent } from "@/components/candidate/onboarding-agent";
import { requirePageProfile } from "@/lib/auth/session";
import { getCandidateGateStatus } from "@/lib/candidate/queries";

export default async function CandidateOnboardingPage() {
  const user = await requirePageProfile("work");
  const { complete, kycVerified } = await getCandidateGateStatus(user.id);
  if (complete) {
    redirect(kycVerified ? "/candidate/home" : "/candidate/kyc");
  }
  return <OnboardingAgent />;
}
