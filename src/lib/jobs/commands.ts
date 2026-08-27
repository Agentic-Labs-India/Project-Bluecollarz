import "server-only";

import { requireCandidateAppReady } from "@/lib/auth/candidate-guard";
import { requireProfile } from "@/lib/auth/session";
import client, { COLLECTIONS, DB_NAME, isId, matchId } from "@/lib/db";
import { ensureIndexes } from "@/lib/db/indexes";
import { isHireCompanyVerified } from "@/lib/hire/onboarding";
import { INTERVIEW_STAGE_IDS, type InterviewStageId } from "@/lib/interviews";
import { getCompletedInterviewStagesByJob } from "@/lib/interviews/queries";
import {
  buildJobDocument,
  formatJobPay,
  formatJobValidationError,
  type JobDocument,
  type JobListItem,
  jobCreateSchema,
  jobUpdateSchema,
  parseCustomQuestions,
  resolveStepTemplates,
  sanitizeJobCreateBody,
  toJobListItem,
} from "@/lib/jobs";
import type { ApplicationDocument, ApplicationStatus } from "@/lib/jobs/applications";
import { revalidatePublishedJobsCache } from "@/lib/jobs/queries";
import { idHex } from "@/lib/utils";

export class JobCommandError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "JobCommandError";
  }
}

export async function createOwnedJob(
  input: unknown,
): Promise<{ id: string; item: JobListItem }> {
  await ensureIndexes();
  const hireAuth = await requireProfile("hire");
  if (!hireAuth.ok) {
    throw new JobCommandError(hireAuth.error, hireAuth.status, hireAuth.code);
  }
  if (!(await isHireCompanyVerified(hireAuth.user.id))) {
    throw new JobCommandError(
      "Complete company onboarding before posting a role.",
      403,
      "ONBOARDING_INCOMPLETE",
    );
  }

  const parsed = jobCreateSchema.safeParse(sanitizeJobCreateBody(input));
  if (!parsed.success) {
    throw new JobCommandError(
      formatJobValidationError(parsed.error),
      400,
      undefined,
      parsed.error.flatten(),
    );
  }

  const doc = buildJobDocument(parsed.data, hireAuth.user);
  const result = await client.db(DB_NAME).collection(COLLECTIONS.JOBS).insertOne(doc);
  if (doc.status === "published") {
    revalidatePublishedJobsCache();
  }
  return {
    id: result.insertedId.toString(),
    item: toJobListItem({ _id: result.insertedId, ...doc }),
  };
}

export async function updateOwnedJob(
  jobId: string,
  input: unknown,
): Promise<JobListItem> {
  await ensureIndexes();
  const hireAuth = await requireProfile("hire");
  if (!hireAuth.ok) {
    throw new JobCommandError(hireAuth.error, hireAuth.status, hireAuth.code);
  }
  if (!isId(jobId)) {
    throw new JobCommandError("Invalid id", 400);
  }

  const parsed = jobUpdateSchema.safeParse(sanitizeJobCreateBody(input));
  if (!parsed.success) {
    throw new JobCommandError(
      formatJobValidationError(parsed.error),
      400,
      undefined,
      parsed.error.flatten(),
    );
  }

  const db = client.db(DB_NAME);
  const collection = db.collection<JobDocument>(COLLECTIONS.JOBS);
  const existing = await collection.findOne({
    _id: matchId(jobId) as never,
    ownerId: matchId(hireAuth.user.id),
  });
  if (!existing) {
    throw new JobCommandError("Job not found", 404);
  }

  const now = new Date();
  const {
    action,
    publish,
    applicationStepTemplates,
    customQuestions,
    ...fields
  } = parsed.data;
  const $set: Record<string, unknown> = { updatedAt: now };
  const $unset: Record<string, ""> = {};

  for (const [key, value] of Object.entries(fields)) {
    if (
      value === null &&
      (key === "countryCode" || key === "stateCode" || key === "raRcNumber")
    ) {
      $unset[key] = "";
    } else if (value !== undefined && value !== null) {
      $set[key] = value;
    }
  }

  if (
    fields.payAmount !== undefined &&
    fields.payType !== undefined &&
    fields.payCurrency !== undefined
  ) {
    $set.pay = formatJobPay(
      fields.payAmount,
      fields.payCurrency,
      fields.payType,
    );
  }

  if (applicationStepTemplates !== undefined) {
    const templates = resolveStepTemplates(applicationStepTemplates);
    $set.applicationStepTemplates = templates;
    if (!templates.some((s) => s.id === "custom-questions")) {
      $set.customQuestions = [];
    }
  }

  if (customQuestions !== undefined) {
    const templates =
      applicationStepTemplates !== undefined
        ? resolveStepTemplates(applicationStepTemplates)
        : resolveStepTemplates(existing.applicationStepTemplates);
    $set.customQuestions = templates.some((s) => s.id === "custom-questions")
      ? parseCustomQuestions(customQuestions)
      : [];
  }

  if (action === "publish" || publish === true) {
    $set.status = "underVerification";
    $set.publishedAt = null;
  } else if (action === "close") {
    $set.status = "closed";
  } else if (action === "reopen") {
    $set.status = "underVerification";
    $set.publishedAt = null;
  } else if (fields.status) {
    if (fields.status === "published") {
      $set.status = "underVerification";
      $set.publishedAt = null;
    } else {
      $set.status = fields.status;
      if (fields.status === "draft" || fields.status === "underVerification") {
        $set.publishedAt = null;
      }
    }
  }

  const updateDoc: {
    $set: Record<string, unknown>;
    $unset?: Record<string, "">;
  } = { $set };
  if (Object.keys($unset).length) updateDoc.$unset = $unset;

  await collection.updateOne(
    { _id: matchId(jobId) as never, ownerId: matchId(hireAuth.user.id) },
    updateDoc,
  );
  const updated = await collection.findOne({ _id: matchId(jobId) as never });
  if (!updated) {
    throw new JobCommandError("Update failed", 500);
  }

  if (
    existing.status === "published" ||
    updated.status === "published" ||
    existing.status !== updated.status
  ) {
    revalidatePublishedJobsCache();
  }

  return toJobListItem(updated);
}

export async function applyToPublishedJob(jobId: string): Promise<{
  applied: true;
}> {
  await ensureIndexes();
  const auth = await requireCandidateAppReady();
  if (!auth.ok) {
    throw new JobCommandError(auth.error, auth.status, auth.code);
  }
  if (!isId(jobId)) {
    throw new JobCommandError("Invalid id", 400);
  }

  const db = client.db(DB_NAME);
  const job = await db
    .collection<JobDocument>(COLLECTIONS.JOBS)
    .findOne({ _id: matchId(jobId) as never, status: "published" });
  if (!job) {
    throw new JobCommandError(
      "This role is no longer accepting applications.",
      404,
    );
  }

  const stageSet = new Set<string>(INTERVIEW_STAGE_IDS);
  const requiredStages = resolveStepTemplates(job.applicationStepTemplates)
    .map((s) => s.id)
    .filter((s): s is InterviewStageId => stageSet.has(s));

  if (requiredStages.length) {
    const completed = await getCompletedInterviewStagesByJob({
      applicantId: auth.user.id,
      jobIds: [jobId],
    });
    const done = completed.get(jobId) ?? new Set();
    const missing = requiredStages.filter((s) => !done.has(s));
    if (missing.length) {
      throw new JobCommandError(
        "Finish required interview stages before applying.",
        403,
        "INTERVIEW_INCOMPLETE",
      );
    }
  }

  const resolvedJobId = idHex(job._id) || jobId;
  const result = await db
    .collection<ApplicationDocument>(COLLECTIONS.APPLICATIONS)
    .updateOne(
      {
        applicantId: matchId(auth.user.id),
        jobId: matchId(resolvedJobId),
      },
      {
        $setOnInsert: {
          jobId: resolvedJobId,
          applicantId: auth.user.id,
          status: "applied",
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );

  if (result.upsertedCount === 1) {
    revalidatePublishedJobsCache();
  }

  return { applied: true };
}

export async function updateOwnedApplicantStatus(opts: {
  ownerId: string;
  jobId: string;
  applicantId: string;
  status: ApplicationStatus;
}): Promise<{ id: string; status: ApplicationStatus; appliedAt: string }> {
  await ensureIndexes();
  if (!isId(opts.jobId) || !isId(opts.applicantId)) {
    throw new JobCommandError("Invalid id", 400);
  }
  const db = client.db(DB_NAME);
  const job = await db.collection<JobDocument>(COLLECTIONS.JOBS).findOne({
    _id: matchId(opts.jobId) as never,
    ownerId: matchId(opts.ownerId),
  });
  if (!job) throw new JobCommandError("Role not found", 404);
  const jobIdHex = idHex(job._id) || opts.jobId;
  const application = await db
    .collection<ApplicationDocument>(COLLECTIONS.APPLICATIONS)
    .findOneAndUpdate(
      {
        jobId: matchId(jobIdHex) as never,
        applicantId: matchId(opts.applicantId) as never,
      },
      { $set: { status: opts.status } },
      { returnDocument: "after" },
    );
  if (!application) throw new JobCommandError("Application not found", 404);
  return {
    id: idHex(application._id),
    status: application.status,
    appliedAt: application.createdAt.toISOString(),
  };
}
