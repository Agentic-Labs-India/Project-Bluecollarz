import { headers } from "next/headers";
import { KycVerification } from "@/components/candidate/kyc/kyc-verification";
import { auth } from "@/lib/auth/auth";
import client, { DB_NAME, COLLECTIONS, isId, matchId } from "@/lib/db";
import type { JobDocument } from "@/lib/jobs";
import { ensureIndexes } from "@/lib/db/indexes";

export default async function KycPage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string }>;
}) {
  const { jobId: rawJobId } = await searchParams;
  const jobId = typeof rawJobId === "string" && isId(rawJobId) ? rawJobId : null;

  let jobTitle: string | null = null;
  if (jobId) {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (userId) {
      await ensureIndexes();
      const db = client.db(DB_NAME);
      const job = await db.collection<JobDocument>(COLLECTIONS.JOBS).findOne({
        _id: matchId(jobId) as never,
        status: "published",
      });
      if (job) jobTitle = job.title;
    }
  }

  return (
    <div className="px-4">
      <KycVerification jobId={jobId} jobTitle={jobTitle} />
    </div>
  );
}
