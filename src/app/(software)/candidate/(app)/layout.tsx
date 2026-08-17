import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/lib/auth/auth";
import { getCandidateGateStatus } from "@/lib/candidate/queries";

/** Locked app surface — onboarding then DigiLocker KYC, then the rest. */
export default function CandidateAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <CandidateAppGate>{children}</CandidateAppGate>
    </Suspense>
  );
}

async function CandidateAppGate({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as { id?: string } | undefined;

  if (!user?.id) redirect("/");

  const { complete, kycVerified } = await getCandidateGateStatus(user.id);
  if (!complete) redirect("/candidate/onboarding");
  if (!kycVerified) redirect("/candidate/kyc");

  return children;
}
