import "server-only";

import client, { DB_NAME, COLLECTIONS, matchId, matchIds } from "@/lib/db";
import { deleteBlobUrls } from "@/lib/blob/delete";
import { kycBlobUrls, type KycFields } from "@/lib/kyc";
import { idHex } from "@/lib/utils";

/**
 * Cascade cleanup before Better Auth removes the user document.
 * Candidates: applications, interviews + recording blobs, KYC blobs,
 * and any legacy resumeUrl blob from older builds.
 * Hirers: owned jobs, apps to those jobs, interviews for those jobs + blobs.
 */
export async function cascadeDeleteUserData(userId: string): Promise<void> {
  if (!userId) return;
  const db = client.db(DB_NAME);
  const blobUrls: string[] = [];

  // KYC docs (+ legacy resumeUrl if an old document still has one).
  const user = await db
    .collection<KycFields & { resumeUrl?: string; email?: string }>(
      COLLECTIONS.USERS_COLLECTION,
    )
    .findOne(
      { _id: matchId(userId) as never },
      {
        projection: {
          resumeUrl: 1,
          kycDocuments: 1,
          email: 1,
        },
      },
    );
  if (typeof user?.resumeUrl === "string" && user.resumeUrl.trim()) {
    blobUrls.push(user.resumeUrl);
  }
  blobUrls.push(...kycBlobUrls(user));

  // Candidate-owned interviews + recordings.
  const ownInterviews = await db
    .collection(COLLECTIONS.INTERVIEWS)
    .find({ applicantId: matchId(userId) } as never)
    .project({ videoUrl: 1 })
    .toArray();
  for (const doc of ownInterviews) {
    if (typeof doc.videoUrl === "string") blobUrls.push(doc.videoUrl);
  }

  await db
    .collection(COLLECTIONS.INTERVIEWS)
    .deleteMany({ applicantId: matchId(userId) } as never);

  // Candidate applications.
  await db
    .collection(COLLECTIONS.APPLICATIONS)
    .deleteMany({ applicantId: matchId(userId) });

  // Support tickets opened by this user.
  await db
    .collection(COLLECTIONS.SUPPORT_TICKETS)
    .deleteMany({ userId: matchId(userId) } as never);

  // Pending invite for this email (if any).
  const email = typeof user?.email === "string" ? user.email.trim().toLowerCase() : "";
  if (email) {
    await db.collection(COLLECTIONS.USER_PROVISIONS).deleteMany({ email });
  }

  // Hire-owned roles → applications + interviews for those jobs.
  const ownedJobs = await db
    .collection(COLLECTIONS.JOBS)
    .find({ ownerId: matchId(userId) })
    .project({ _id: 1 })
    .toArray();
  const jobIdHexes = ownedJobs.map((job) => idHex(job._id)).filter(Boolean);

  if (jobIdHexes.length) {
    const jobInterviews = await db
      .collection(COLLECTIONS.INTERVIEWS)
      .find({ jobId: { $in: jobIdHexes } } as never)
      .project({ videoUrl: 1 })
      .toArray();
    for (const doc of jobInterviews) {
      if (typeof doc.videoUrl === "string") blobUrls.push(doc.videoUrl);
    }

    await db
      .collection(COLLECTIONS.INTERVIEWS)
      .deleteMany({ jobId: { $in: jobIdHexes } } as never);

    await db
      .collection(COLLECTIONS.APPLICATIONS)
      .deleteMany({ jobId: { $in: matchIds(jobIdHexes) } });

    await db
      .collection(COLLECTIONS.JOBS)
      .deleteMany({ ownerId: matchId(userId) });
  }

  await deleteBlobUrls(blobUrls);
}
