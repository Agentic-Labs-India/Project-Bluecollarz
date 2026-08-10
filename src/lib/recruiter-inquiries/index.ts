import "server-only";
import { ObjectId } from "mongodb";
import client, { COLLECTIONS, DB_NAME, isId, matchId } from "@/lib/db";
import { ensureIndexes } from "@/lib/db/indexes";
import { upsertUserProfileTypeByEmail } from "@/lib/admin/queries";
import { idHex } from "@/lib/utils";
import type {
  RecruiterInquiryCreateInput,
  RecruiterInquiryListItem,
  RecruiterInquiryStatus,
} from "@/lib/recruiter-inquiries/types";

type RecruiterInquiryDoc = {
  _id: ObjectId;
  contactName: string;
  companyName: string;
  email: string;
  phoneCountryCode: number;
  phoneNumber: number;
  industry: string;
  country: string;
  companySize: string;
  website: string;
  about: string;
  status: RecruiterInquiryStatus;
  adminNote: string;
  reviewedAt: Date | null;
  reviewedById: string | null;
  reviewedByEmail: string | null;
  reviewedByName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toListItem(doc: RecruiterInquiryDoc): RecruiterInquiryListItem {
  return {
    id: idHex(doc._id),
    contactName: doc.contactName,
    companyName: doc.companyName,
    email: doc.email,
    phoneCountryCode: doc.phoneCountryCode,
    phoneNumber: doc.phoneNumber,
    industry: doc.industry,
    country: doc.country,
    companySize: doc.companySize,
    website: doc.website || "",
    about: doc.about,
    status: doc.status,
    adminNote: doc.adminNote || "",
    reviewedAt: doc.reviewedAt ? doc.reviewedAt.toISOString() : null,
    reviewedByEmail: doc.reviewedByEmail,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function collection() {
  return client
    .db(DB_NAME)
    .collection<RecruiterInquiryDoc>(COLLECTIONS.RECRUITER_INQUIRIES);
}

export async function createRecruiterInquiry(
  input: RecruiterInquiryCreateInput,
): Promise<RecruiterInquiryListItem> {
  await ensureIndexes();
  const email = input.email.trim().toLowerCase();
  const now = new Date();

  // One open (pending) request per email — update in place if they resubmit.
  const existing = await collection().findOne({
    email,
    status: "pending",
  });

  if (existing) {
    const updated = await collection().findOneAndUpdate(
      { _id: existing._id },
      {
        $set: {
          contactName: input.contactName.trim(),
          companyName: input.companyName.trim(),
          phoneCountryCode: input.phoneCountryCode,
          phoneNumber: input.phoneNumber,
          industry: input.industry,
          country: input.country.trim(),
          companySize: input.companySize,
          website: (input.website || "").trim(),
          about: input.about.trim(),
          updatedAt: now,
        },
      },
      { returnDocument: "after" },
    );
    if (!updated) throw new Error("Failed to update inquiry");
    return toListItem(updated);
  }

  const _id = new ObjectId();
  const doc: RecruiterInquiryDoc = {
    _id,
    contactName: input.contactName.trim(),
    companyName: input.companyName.trim(),
    email,
    phoneCountryCode: input.phoneCountryCode,
    phoneNumber: input.phoneNumber,
    industry: input.industry,
    country: input.country.trim(),
    companySize: input.companySize,
    website: (input.website || "").trim(),
    about: input.about.trim(),
    status: "pending",
    adminNote: "",
    reviewedAt: null,
    reviewedById: null,
    reviewedByEmail: null,
    reviewedByName: null,
    createdAt: now,
    updatedAt: now,
  };
  await collection().insertOne(doc);
  return toListItem(doc);
}

export async function listRecruiterInquiries(opts?: {
  status?: RecruiterInquiryStatus | "all";
  limit?: number;
}): Promise<{ items: RecruiterInquiryListItem[]; hasMore: boolean }> {
  await ensureIndexes();
  const limit = Math.min(Math.max(opts?.limit ?? 100, 1), 200);
  const filter =
    opts?.status && opts.status !== "all" ? { status: opts.status } : {};
  const docs = await collection()
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .toArray();
  const hasMore = docs.length > limit;
  return {
    items: docs.slice(0, limit).map(toListItem),
    hasMore,
  };
}

export async function getRecruiterInquiry(
  id: string,
): Promise<RecruiterInquiryListItem | null> {
  if (!isId(id)) return null;
  await ensureIndexes();
  const doc = await collection().findOne({ _id: matchId(id) as never });
  return doc ? toListItem(doc) : null;
}

export async function reviewRecruiterInquiry(opts: {
  id: string;
  status: "approved" | "rejected";
  adminNote?: string;
  reviewer: { id: string; email: string; name?: string | null };
}): Promise<RecruiterInquiryListItem | null> {
  if (!isId(opts.id)) return null;
  await ensureIndexes();
  const existing = await collection().findOne({
    _id: matchId(opts.id) as never,
  });
  if (!existing) return null;
  if (existing.status !== "pending") {
    throw new Error(`Inquiry is already ${existing.status}`);
  }

  if (opts.status === "approved") {
    await upsertUserProfileTypeByEmail(existing.email, "hire");
  }

  const now = new Date();
  const updated = await collection().findOneAndUpdate(
    { _id: existing._id },
    {
      $set: {
        status: opts.status,
        adminNote: (opts.adminNote || "").trim(),
        reviewedAt: now,
        reviewedById: opts.reviewer.id,
        reviewedByEmail: opts.reviewer.email.trim().toLowerCase(),
        reviewedByName: opts.reviewer.name?.trim() || null,
        updatedAt: now,
      },
    },
    { returnDocument: "after" },
  );
  return updated ? toListItem(updated) : null;
}
