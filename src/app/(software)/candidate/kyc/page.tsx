import { redirect } from "next/navigation";
import { Suspense } from "react";
import { KycVerification } from "@/components/candidate/kyc/kyc-verification";
import { KycPageSkeleton } from "@/components/layout/page-skeleton";
import { requirePageProfile } from "@/lib/auth/session";
import { getCandidateGateStatus } from "@/lib/candidate/queries";

export default async function KycPage() {
  const user = await requirePageProfile("work");
  const { complete } = await getCandidateGateStatus(user.id);
  if (!complete) redirect("/candidate/onboarding");

  return (
    <Suspense fallback={<KycPageSkeleton />}>
      <KycVerification />
    </Suspense>
  );
}
