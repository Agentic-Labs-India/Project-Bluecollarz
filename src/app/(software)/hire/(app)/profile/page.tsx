import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { HireProfileView } from "@/components/hire/hire-profile-view";
import { auth } from "@/lib/auth/auth";
import { getHireOverview } from "@/lib/hire/queries";
import { getHireOnboarding } from "@/lib/hire/onboarding";

export default async function HireProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as { id?: string; email?: string } | undefined;
  if (!user?.id) redirect("/");

  const [overview, onboarding] = await Promise.all([
    getHireOverview({
      id: user.id,
      email: user.email ?? "",
    }),
    getHireOnboarding(user.id),
  ]);

  return <HireProfileView overview={overview} onboarding={onboarding} />;
}
