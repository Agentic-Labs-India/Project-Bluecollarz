import "server-only";

import { deleteBlobUrls } from "@/lib/blob/delete";
import { assertAccountErasable } from "@/lib/compliance/legal-hold";
import client, { COLLECTIONS, DB_NAME, matchId, matchIds } from "@/lib/db";
import { idHex } from "@/lib/utils";

/**
 * Cascade cleanup before Better Auth removes the user document.
 * Candidates: applications, interviews + recording blobs.
 * Hirers: owned jobs, apps to those jobs, interviews for those jobs + blobs.
 */
export async function cascadeDeleteUserData(userId: string): Promise<void> {
  if (!userId) return;
  await assertAccountErasable(userId);
  const db = client.db(DB_NAME);
  const blobUrls: string[] = [];

  const user = await db
    .collection<{ email?: string }>(COLLECTIONS.USERS_COLLECTION)
    .findOne({ _id: matchId(userId) as never }, { projection: { email: 1 } });

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

  const ownAppointments = await db
    .collection(COLLECTIONS.MEDICAL_APPOINTMENTS)
    .find({ applicantId: userId })
    .project({ reports: 1 })
    .toArray();
  for (const doc of ownAppointments) {
    const reports = Array.isArray(doc.reports) ? doc.reports : [];
    for (const report of reports) {
      if (typeof report?.url === "string") blobUrls.push(report.url);
    }
  }

  await db
    .collection(COLLECTIONS.MEDICAL_APPOINTMENTS)
    .deleteMany({ applicantId: userId });

  // Support tickets opened by this user.
  await db
    .collection(COLLECTIONS.SUPPORT_TICKETS)
    .deleteMany({ userId: matchId(userId) } as never);

  // Pending invite for this email (if any).
  const email =
    typeof user?.email === "string" ? user.email.trim().toLowerCase() : "";
  if (email) {
    await db.collection(COLLECTIONS.USER_PROVISIONS).deleteMany({ email });
    await db.collection(COLLECTIONS.RECRUITER_INQUIRIES).deleteMany({ email });
  }

  // DPDP + legal-safety rows for this principal. The breach register stays;
  // only this person's id is removed.
  await db
    .collection(COLLECTIONS.CONSENT_EVENTS)
    .deleteMany({ dataPrincipalId: userId });
  await db.collection(COLLECTIONS.CONSENT_PLAYBACKS).deleteMany({ userId });
  await db
    .collection(COLLECTIONS.RIGHTS_REQUESTS)
    .deleteMany({ dataPrincipalId: userId });
  await db
    .collection(COLLECTIONS.LEGAL_SAFETY_NOTICES)
    .deleteMany({ userId });
  await db
    .collection(COLLECTIONS.LEGAL_HOLDS)
    .deleteMany({ dataPrincipalId: userId });
  await db
    .collection(COLLECTIONS.LEGAL_SAFETY_CASES)
    .deleteMany({ subjectUserId: userId });
  await db.collection(COLLECTIONS.BREACH_INCIDENTS).updateMany(
    { affectedPrincipalIds: userId } as never,
    { $pull: { affectedPrincipalIds: userId } } as never,
  );

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

    const jobAppointments = await db
      .collection(COLLECTIONS.MEDICAL_APPOINTMENTS)
      .find({ jobId: { $in: jobIdHexes } })
      .project({ reports: 1 })
      .toArray();
    for (const doc of jobAppointments) {
      const reports = Array.isArray(doc.reports) ? doc.reports : [];
      for (const report of reports) {
        if (typeof report?.url === "string") blobUrls.push(report.url);
      }
    }

    await db
      .collection(COLLECTIONS.MEDICAL_APPOINTMENTS)
      .deleteMany({ jobId: { $in: jobIdHexes } });

    await db
      .collection(COLLECTIONS.JOBS)
      .deleteMany({ ownerId: matchId(userId) });
  }

  await deleteBlobUrls(blobUrls);
}
