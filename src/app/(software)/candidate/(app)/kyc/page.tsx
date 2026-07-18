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

  return (
    <div className="px-4 py-6 md:px-6 md:py-8">
      <KycVerification jobId={jobId} jobTitle={jobTitle} />
    </div>
  );
}
