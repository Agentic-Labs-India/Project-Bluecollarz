import client, { DB_NAME, COLLECTIONS } from "@/lib/db";
import type { InterviewDocument, InterviewStageId } from "@/lib/interviews";
import { idHex } from "@/lib/utils";
import { ensureIndexes } from "@/lib/db/indexes";

/** Completed interview stage ids for a candidate across the given jobs. */
export async function getCompletedInterviewStagesByJob(opts: {
  applicantId: string;
  jobIds: string[];
}): Promise<Map<string, Set<InterviewStageId>>> {
  await ensureIndexes();
  const map = new Map<string, Set<InterviewStageId>>();
  if (!opts.applicantId || !opts.jobIds.length) return map;

  const db = client.db(DB_NAME);
  const docs = await db
    .collection<InterviewDocument>(COLLECTIONS.INTERVIEWS)
    .find({
      applicantId: opts.applicantId,
      jobId: { $in: opts.jobIds },
      status: "completed",
    } as never)
    .project({ jobId: 1, stageId: 1 })
    .toArray();

  for (const doc of docs) {
    const jobId = idHex(doc.jobId) || String(doc.jobId);
    const set = map.get(jobId) ?? new Set<InterviewStageId>();
    set.add(doc.stageId);
    map.set(jobId, set);
  }
  return map;
}
