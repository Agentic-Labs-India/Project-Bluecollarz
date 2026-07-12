import "server-only";

import { del } from "@vercel/blob";
import client, { DB_NAME, COLLECTIONS, matchId, matchIds } from "@/lib/db";
import { isVercelBlobUrl } from "@/lib/blob/pathname";
import { idHex } from "@/lib/utils";

/** Best-effort delete of Vercel Blob URLs (never throws). */
export async function deleteBlobUrls(
  urls: Array<string | null | undefined>,
): Promise<void> {
  const unique = [
    ...new Set(
      urls.filter(
        (url): url is string => typeof url === "string" && isVercelBlobUrl(url),
      ),
    ),
  ];
  if (!unique.length) return;
  try {
    await del(unique);
  } catch (error) {
    console.warn("deleteBlobUrls:", error);
  }
}

/**
 * Cascade cleanup before Better Auth removes the user document.
 * Candidates: applications, interviews + recording blobs, profile resume blob.
 * Hirers: owned jobs, apps to those jobs, interviews for those jobs + blobs.
 */
export async function cascadeDeleteUserData(userId: string): Promise<void> {
  if (!userId) return;
  const db = client.db(DB_NAME);
  const blobUrls: string[] = [];

  // Profile resume (if stored as a Blob URL).
  const user = await db.collection(COLLECTIONS.USERS_COLLECTION).findOne(
    { _id: matchId(userId) as never },
    { projection: { resumeUrl: 1 } },
  );
  if (typeof user?.resumeUrl === "string") {
    blobUrls.push(user.resumeUrl);
  }

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
