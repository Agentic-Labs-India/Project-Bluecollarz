import { redirect } from "next/navigation";
import { HireOnboardingForm } from "@/components/hire/onboarding/form";
import { requirePageProfile } from "@/lib/auth/session";
import { getOrCreateHireOnboarding } from "@/lib/hire/onboarding";
import { isHireOnboardingVerified } from "@/lib/hire/onboarding/types";

export default async function HireOnboardingPage() {
  const user = await requirePageProfile("hire");
  const item = await getOrCreateHireOnboarding(user.id);
  if (isHireOnboardingVerified(item.status)) redirect("/hire/roles");
  return <HireOnboardingForm initial={item} />;
}
