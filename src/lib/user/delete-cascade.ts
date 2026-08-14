import "server-only";

import client, { DB_NAME, COLLECTIONS, matchId, matchIds } from "@/lib/db";
import { deleteBlobUrls } from "@/lib/blob/delete";
import { idHex } from "@/lib/utils";

/**
 * Cascade cleanup before Better Auth removes the user document.
 * Candidates: applications, interviews + recording blobs.
 * Hirers: owned jobs, apps to those jobs, interviews for those jobs + blobs.
 */
export async function cascadeDeleteUserData(userId: string): Promise<void> {
  if (!userId) return;
  const db = client.db(DB_NAME);
  const blobUrls: string[] = [];

  const user = await db
    .collection<{ email?: string }>(COLLECTIONS.USERS_COLLECTION)
    .findOne(
      { _id: matchId(userId) as never },
      { projection: { email: 1 } },
    );

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
    await db.collection(COLLECTIONS.RECRUITER_INQUIRIES).deleteMany({ email });
  }

  // Consent + rights artifacts for this principal.
  await db
    .collection(COLLECTIONS.CONSENT_EVENTS)
    .deleteMany({ dataPrincipalId: userId });
  await db
    .collection(COLLECTIONS.RIGHTS_REQUESTS)
    .deleteMany({ dataPrincipalId: userId });

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
