import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { HireOnboardingForm } from "@/components/hire/onboarding/form";
import { auth } from "@/lib/auth/auth";
import { getOrCreateHireOnboarding } from "@/lib/hire/onboarding";
import { isHireOnboardingVerified } from "@/lib/hire/onboarding/types";

export default async function HireOnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as { id?: string } | undefined;
  if (!user?.id) redirect("/");

  const item = await getOrCreateHireOnboarding(user.id);
  if (isHireOnboardingVerified(item.status)) redirect("/hire/roles");

  return <HireOnboardingForm initial={item} />;
}
