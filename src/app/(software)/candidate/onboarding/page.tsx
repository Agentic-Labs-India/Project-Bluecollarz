import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { OnboardingAgent } from "@/components/candidate/onboarding-agent";
import { auth } from "@/lib/auth/auth";
import { isCandidateOnboardingDone } from "@/lib/candidate/queries";
import {
  getProfileHomePath,
  normalizeProfileType,
} from "@/lib/profile-types";

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

  if (await isCandidateOnboardingDone(user.id)) {
    redirect("/candidate/home");
  }

  return <OnboardingAgent />;
}
