import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { isCandidateOnboardingDone } from "@/lib/candidate/queries";

/** Locked app surface — incomplete candidates are sent to onboarding. */
export default function CandidateAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <OnboardingCompleteGate>{children}</OnboardingCompleteGate>
    </Suspense>
  );
}

async function OnboardingCompleteGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as { id?: string } | undefined;

  if (!user?.id) redirect("/");

  if (!(await isCandidateOnboardingDone(user.id))) {
    redirect("/candidate/onboarding");
  }

  return children;
}
