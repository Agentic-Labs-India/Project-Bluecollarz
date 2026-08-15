import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { KycVerification } from "@/components/candidate/kyc/kyc-verification";
import { KycPageSkeleton } from "@/components/layout/page-skeleton";
import { auth } from "@/lib/auth/auth";
import { getCandidateGateStatus } from "@/lib/candidate/queries";

export default async function KycPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/");

  const { complete } = await getCandidateGateStatus(userId);
  if (!complete) redirect("/candidate/onboarding");

  return (
    <Suspense fallback={<KycPageSkeleton />}>
      <KycVerification />
    </Suspense>
  );
}
