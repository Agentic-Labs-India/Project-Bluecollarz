import { redirect } from "next/navigation";
import { Suspense } from "react";
import { KycVerification } from "@/components/candidate/kyc/kyc-verification";
import { KycPageSkeleton } from "@/components/layout/page-skeleton";
import { requirePageProfile } from "@/lib/auth/session";
import { getCandidateGateStatus } from "@/lib/candidate/queries";

export default function KycPage() {
  return (
    <Suspense fallback={<KycPageSkeleton />}>
      <KycPageGate />
    </Suspense>
  );
}

async function KycPageGate() {
  const user = await requirePageProfile("work");
  const { complete } = await getCandidateGateStatus(user.id);
  if (!complete) redirect("/candidate/onboarding");

  return <KycVerification />;
}
