import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requirePageProfile } from "@/lib/auth/session";
import { getCandidateGateStatus } from "@/lib/candidate/queries";

/** Locked app surface — DigiLocker KYC then onboarding, then the rest. */
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
  const user = await requirePageProfile("work");
  const { complete, kycVerified } = await getCandidateGateStatus(user.id);
  if (!kycVerified) redirect("/candidate/kyc");
  if (!complete) redirect("/candidate/onboarding");
  return children;
}
