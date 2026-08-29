import "server-only";

import type { Resend } from "resend";
import {
  formatSenderFrom,
  getResendClient,
  getResendFromEmail,
} from "@/lib/admin/resend";
import { countryName, stateName } from "@/lib/core/geo/places";
import client, {
  COLLECTIONS,
  DB_NAME,
  isId,
  matchId,
  matchIds,
} from "@/lib/db";
import {
  JOB_LOCATION_LABELS,
  type JobDocument,
  parseCustomQuestions,
  resolveStepTemplates,
  toJobListItem,
} from "@/lib/jobs";
import { revalidatePublishedJobsCache } from "@/lib/jobs/queries";
import type {
  AdminJobVerificationItem,
  AdminJobVerificationListItem,
} from "@/lib/admin/types";
import { idHex } from "@/lib/utils";

type UserEmailDoc = {
  _id?: unknown;
  email?: string;
  name?: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function requireResend(): { resend: Resend; fromEmail: string } {
  const resend = getResendClient();
  const fromEmail = getResendFromEmail();
  if (!resend || !fromEmail) {
    throw new Error(
      "Email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.",
    );
  }
  return { resend, fromEmail };
}

function toListItem(
  doc: JobDocument,
  owner?: UserEmailDoc | null,
): AdminJobVerificationListItem {
  return {
    ...toJobListItem(doc),
    ownerEmail: owner?.email?.trim() || null,
    ownerName: owner?.name?.trim() || null,
  };
}

function toDetailItem(
  doc: JobDocument,
  owner?: UserEmailDoc | null,
): AdminJobVerificationItem {
  return {
    ...toListItem(doc, owner),
    overviewHtml: doc.overview,
    locationLabel: doc.location ? JOB_LOCATION_LABELS[doc.location] : null,
    countryLabel: countryName(doc.countryCode) || null,
    stateLabel: stateName(doc.countryCode, doc.stateCode) || null,
    stages: resolveStepTemplates(doc.applicationStepTemplates).map(
      (step) => step.label,
    ),
    customQuestions: parseCustomQuestions(doc.customQuestions).map(
      (q) => q.prompt,
    ),
    raRcNumber: doc.raRcNumber ?? null,
  };
}

async function findOwner(ownerId: unknown) {
  const db = client.db(DB_NAME);
  return db
    .collection<UserEmailDoc>(COLLECTIONS.USERS_COLLECTION)
    .findOne({ _id: matchId(idHex(ownerId)) as never });
}

/** Jobs waiting on admin approval (table rows only). */
export async function listJobsUnderVerification(): Promise<
  AdminJobVerificationListItem[]
> {
  const db = client.db(DB_NAME);
  const docs = await db
    .collection<JobDocument>(COLLECTIONS.JOBS)
    .find({ status: "underVerification" })
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(200)
    .toArray();

  if (!docs.length) return [];

  const ownerIds = [
    ...new Set(docs.map((doc) => idHex(doc.ownerId)).filter(Boolean)),
  ];
  const owners = ownerIds.length
    ? await db
        .collection<UserEmailDoc>(COLLECTIONS.USERS_COLLECTION)
        .find({ _id: { $in: matchIds(ownerIds) } as never })
        .project({ email: 1, name: 1 })
        .toArray()
    : [];

  const ownerById = new Map<string, UserEmailDoc>();
  for (const owner of owners) {
    ownerById.set(idHex(owner._id), owner);
  }

  return docs.map((doc) => toListItem(doc, ownerById.get(idHex(doc.ownerId))));
}

/** Full posting for the verification sheet. */
export async function getJobUnderVerification(
  id: string,
): Promise<AdminJobVerificationItem | null> {
  if (!isId(id)) return null;
  const db = client.db(DB_NAME);
  const doc = await db.collection<JobDocument>(COLLECTIONS.JOBS).findOne({
    _id: matchId(id) as never,
    status: "underVerification",
  });
  if (!doc) return null;
  const owner = await findOwner(doc.ownerId);
  return toDetailItem(doc, owner);
}

async function sendJobReviewEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  reviewerName?: string | null;
}) {
  const { resend, fromEmail } = requireResend();
  const result = await resend.emails.send({
    from: formatSenderFrom(opts.reviewerName || "Blucollarz", fromEmail),
    to: [opts.to],
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
  if (result.error) {
    throw new Error(result.error.message || "Failed to send email via Resend");
  }
}

export async function approveJobVerification(opts: {
  id: string;
  reviewerName?: string | null;
  raRcNumber?: string | null;
}): Promise<AdminJobVerificationItem> {
  const { id, reviewerName } = opts;
  if (!isId(id)) throw new Error("Invalid job id");

  requireResend();

  const db = client.db(DB_NAME);
  const collection = db.collection<JobDocument>(COLLECTIONS.JOBS);
  const existing = await collection.findOne({
    _id: matchId(id) as never,
    status: "underVerification",
  });
  if (!existing) throw new Error("Job not found or not awaiting verification");

  const owner = await findOwner(existing.ownerId);
  const ownerEmail = owner?.email?.trim();
  if (!ownerEmail) {
    throw new Error("Recruiter email not found — cannot send approval email");
  }

  const raRcNumber =
    opts.raRcNumber?.trim() || existing.raRcNumber?.trim() || null;

  const now = new Date();
  const updated = await collection.findOneAndUpdate(
    { _id: matchId(id) as never, status: "underVerification" },
    {
      $set: {
        status: "published",
        publishedAt: existing.publishedAt ?? now,
        updatedAt: now,
        raRcNumber,
      },
    },
    { returnDocument: "after" },
  );
  if (!updated) throw new Error("Update failed");
  revalidatePublishedJobsCache();

  const title = updated.title.trim() || "your role";
  const safeTitle = escapeHtml(title);
  await sendJobReviewEmail({
    to: ownerEmail,
    reviewerName,
    subject: `Job posting approved: ${title}`,
    html: `
      <p>Your job posting request for <strong>${safeTitle}</strong> was approved.</p>
      <p>The role is now live and visible to candidates.</p>
      <p>It may take up to about 4 hours for the listing to fully propagate.</p>
    `,
    text: [
      `Your job posting request for "${title}" was approved.`,
      "The role is now live and visible to candidates.",
      "It may take up to about 4 hours for the listing to fully propagate.",
    ].join("\n\n"),
  });

  return toDetailItem(updated, owner);
}

export async function denyJobVerification(opts: {
  id: string;
  reason: string;
  reviewerName?: string | null;
}): Promise<AdminJobVerificationItem> {
  const { id, reason, reviewerName } = opts;
  if (!isId(id)) throw new Error("Invalid job id");

  requireResend();

  const db = client.db(DB_NAME);
  const collection = db.collection<JobDocument>(COLLECTIONS.JOBS);
  const existing = await collection.findOne({
    _id: matchId(id) as never,
    status: "underVerification",
  });
  if (!existing) throw new Error("Job not found or not awaiting verification");

  const owner = await findOwner(existing.ownerId);
  const ownerEmail = owner?.email?.trim();
  if (!ownerEmail) {
    throw new Error("Recruiter email not found — cannot send denial email");
  }

  const now = new Date();
  const updated = await collection.findOneAndUpdate(
    { _id: matchId(id) as never, status: "underVerification" },
    {
      $set: {
        status: "draft",
        publishedAt: null,
        updatedAt: now,
      },
    },
    { returnDocument: "after" },
  );
  if (!updated) throw new Error("Update failed");

  const title = updated.title.trim() || "your role";
  const safeTitle = escapeHtml(title);
  const safeReason = escapeHtml(reason.trim());
  await sendJobReviewEmail({
    to: ownerEmail,
    reviewerName,
    subject: `Job posting rejected: ${title}`,
    html: `
      <p>Your job posting request for <strong>${safeTitle}</strong> was rejected.</p>
      <p><strong>Reason:</strong> ${safeReason}</p>
      <p>We have put it in draft mode for you to make changes and submit again if eligible.</p>
    `,
    text: [
      `Your job posting request for "${title}" was rejected.`,
      `Reason: ${reason.trim()}`,
      "We have put it in draft mode for you to make changes and submit again if eligible.",
    ].join("\n\n"),
  });

  return toDetailItem(updated, owner);
}
