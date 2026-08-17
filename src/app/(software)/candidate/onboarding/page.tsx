import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { OnboardingAgent } from "@/components/candidate/onboarding-agent";
import { auth } from "@/lib/auth/auth";
import { getCandidateGateStatus } from "@/lib/candidate/queries";
import {
  getProfileHomePath,
  normalizeProfileType,
} from "@/lib/user/profile-types";

export default function CandidateOnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingPageGate />
    </Suspense>
  );
}

async function OnboardingPageGate() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as
    | { id?: string; profileType?: string }
    | undefined;

  if (!user?.id) redirect("/");
  const profileType = normalizeProfileType(user.profileType);
  if (profileType !== "work") {
    redirect(getProfileHomePath(profileType));
  }

  const { complete, kycVerified } = await getCandidateGateStatus(user.id);
  if (complete) {
    redirect(kycVerified ? "/candidate/home" : "/candidate/kyc");
  }

  return <OnboardingAgent />;
}
