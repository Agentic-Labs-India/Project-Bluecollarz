import { Suspense } from "react";
import { KycVerification } from "@/components/candidate/kyc/kyc-verification";
import { KycPageSkeleton } from "@/components/layout/page-skeleton";
import { isId } from "@/lib/db";
import { getPublishedJobTitle } from "@/lib/candidate/queries";

export default async function KycPage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string }>;
}) {
  const { jobId: rawJobId } = await searchParams;
  const jobId = typeof rawJobId === "string" && isId(rawJobId) ? rawJobId : null;
  const jobTitle = jobId ? await getPublishedJobTitle(jobId) : null;

  return (
    <Suspense fallback={<KycPageSkeleton />}>
      <KycVerification jobId={jobId} jobTitle={jobTitle} />
    </Suspense>
  );
}
