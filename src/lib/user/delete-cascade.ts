import "server-only";

import { deleteBlobUrls } from "@/lib/blob/server/delete";
import { assertNoLegalHold } from "@/lib/compliance/legal-hold";
import client, { COLLECTIONS, DB_NAME, matchId, matchIds } from "@/lib/db";
import { collectHireOnboardingBlobUrls } from "@/lib/hire/onboarding";
import { idHex } from "@/lib/utils";

function pushReportUrls(
  blobUrls: string[],
  docs: Array<{ reports?: unknown }>,
) {
  for (const doc of docs) {
    const reports = Array.isArray(doc.reports) ? doc.reports : [];
    for (const report of reports) {
      if (typeof report?.url === "string") blobUrls.push(report.url);
    }
  }
}

/**
 * Cascade cleanup before Better Auth removes the user document.
 * Blobs are deleted first so a store failure can be retried without orphans.
 * Candidates: applications, interviews + recordings, medical reports.
 * Hirers: owned jobs, related interviews/medical, company onboarding docs.
 */
export async function cascadeDeleteUserData(userId: string): Promise<void> {
  if (!userId) return;
  await assertNoLegalHold(userId);
  const db = client.db(DB_NAME);
  const blobUrls: string[] = [];

  const user = await db
    .collection<{ email?: string }>(COLLECTIONS.USERS_COLLECTION)
    .findOne({ _id: matchId(userId) as never }, { projection: { email: 1 } });

  const ownInterviews = await db
    .collection(COLLECTIONS.INTERVIEWS)
    .find({ applicantId: matchId(userId) } as never)
    .project({ videoUrl: 1 })
    .toArray();
  for (const doc of ownInterviews) {
    if (typeof doc.videoUrl === "string") blobUrls.push(doc.videoUrl);
  }

  const ownAppointments = await db
    .collection(COLLECTIONS.MEDICAL_APPOINTMENTS)
    .find({ applicantId: userId })
    .project({ reports: 1 })
    .toArray();
  pushReportUrls(blobUrls, ownAppointments);

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

    const jobAppointments = await db
      .collection(COLLECTIONS.MEDICAL_APPOINTMENTS)
      .find({ jobId: { $in: jobIdHexes } })
      .project({ reports: 1 })
      .toArray();
    pushReportUrls(blobUrls, jobAppointments);
  }

  const hireOnboarding = await db
    .collection<{
      documents?: {
        establishmentCard?: { url?: string | null } | null;
        immigrationFile?: { url?: string | null } | null;
      };
      legalLicences?: Array<{ document?: { url?: string | null } | null }>;
    }>(COLLECTIONS.HIRE_ONBOARDINGS)
    .findOne({ userId: matchId(userId) } as never);
  if (hireOnboarding) {
    blobUrls.push(...collectHireOnboardingBlobUrls(hireOnboarding));
  }

  await deleteBlobUrls(blobUrls, { required: true });

  await db
    .collection(COLLECTIONS.INTERVIEWS)
    .deleteMany({ applicantId: matchId(userId) } as never);
  await db
    .collection(COLLECTIONS.APPLICATIONS)
    .deleteMany({ applicantId: matchId(userId) });
  await db
    .collection(COLLECTIONS.MEDICAL_APPOINTMENTS)
    .deleteMany({ applicantId: userId });
  await db
    .collection(COLLECTIONS.SUPPORT_TICKETS)
    .deleteMany({ userId: matchId(userId) } as never);

  const email =
    typeof user?.email === "string" ? user.email.trim().toLowerCase() : "";
  if (email) {
    await db.collection(COLLECTIONS.USER_PROVISIONS).deleteMany({ email });
    await db.collection(COLLECTIONS.RECRUITER_INQUIRIES).deleteMany({ email });
  }

  await db
    .collection(COLLECTIONS.CONSENT_EVENTS)
    .deleteMany({ dataPrincipalId: userId });
  await db.collection(COLLECTIONS.CONSENT_PLAYBACKS).deleteMany({ userId });
  await db
    .collection(COLLECTIONS.RIGHTS_REQUESTS)
    .deleteMany({ dataPrincipalId: userId });
  await db.collection(COLLECTIONS.LEGAL_SAFETY_NOTICES).deleteMany({ userId });
  await db
    .collection(COLLECTIONS.LEGAL_HOLDS)
    .deleteMany({ dataPrincipalId: userId });
  await db
    .collection(COLLECTIONS.LEGAL_SAFETY_CASES)
    .deleteMany({ subjectUserId: userId });
  await db
    .collection(COLLECTIONS.BREACH_INCIDENTS)
    .updateMany(
      { affectedPrincipalIds: userId } as never,
      { $pull: { affectedPrincipalIds: userId } } as never,
    );

  if (jobIdHexes.length) {
    await db
      .collection(COLLECTIONS.INTERVIEWS)
      .deleteMany({ jobId: { $in: jobIdHexes } } as never);
    await db
      .collection(COLLECTIONS.APPLICATIONS)
      .deleteMany({ jobId: { $in: matchIds(jobIdHexes) } });
    await db
      .collection(COLLECTIONS.MEDICAL_APPOINTMENTS)
      .deleteMany({ jobId: { $in: jobIdHexes } });
    await db
      .collection(COLLECTIONS.JOBS)
      .deleteMany({ ownerId: matchId(userId) });
  }

  await db
    .collection(COLLECTIONS.HIRE_ONBOARDINGS)
    .deleteMany({ userId: matchId(userId) } as never);
}
