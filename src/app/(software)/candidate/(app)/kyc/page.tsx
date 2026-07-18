import { KycVerification } from "@/components/candidate/kyc/kyc-verification";
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

  return <KycVerification jobId={jobId} jobTitle={jobTitle} />;
}
