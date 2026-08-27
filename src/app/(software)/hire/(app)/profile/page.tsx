import { HireProfileView } from "@/components/hire/hire-profile-view";
import { requirePageProfile } from "@/lib/auth/session";
import { getHireOnboarding } from "@/lib/hire/onboarding";
import { getHireOverview } from "@/lib/hire/queries";

export default async function HireProfilePage() {
  const user = await requirePageProfile("hire");
  const [overview, onboarding] = await Promise.all([
    getHireOverview({ id: user.id, email: user.email }),
    getHireOnboarding(user.id),
  ]);
  return <HireProfileView overview={overview} onboarding={onboarding} />;
}
