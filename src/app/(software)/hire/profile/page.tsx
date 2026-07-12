import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { HireProfileView } from "@/components/hire/hire-profile-view";
import { auth } from "@/lib/auth/auth";
import { getHireOverview } from "@/lib/hire/queries";
import { isHireProfileComplete } from "@/lib/hire/profile";

export default async function HireProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ complete?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as { id?: string; email?: string } | undefined;
  if (!user?.id) redirect("/");

  const overview = await getHireOverview({
    id: user.id,
    email: user.email ?? "",
  });
  const params = await searchParams;
  const requireComplete = params.complete === "required";
  const profileComplete = isHireProfileComplete(overview.profile);

  return (
    <HireProfileView
      overview={overview}
      showCompletePrompt={requireComplete && !profileComplete}
    />
  );
}
