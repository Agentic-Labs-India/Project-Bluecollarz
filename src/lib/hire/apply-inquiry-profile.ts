import "server-only";
import client, { COLLECTIONS, DB_NAME, matchId } from "@/lib/db";
import { ensureIndexes } from "@/lib/db/indexes";
import type { RecruiterInquiryListItem } from "@/lib/hire/inquiries/types";
import {
  type HireProfileFields,
  type HireProfileFromInquiry,
  hireProfileFromInquiry,
} from "@/lib/hire/profile";

type HireUserDoc = HireProfileFields & {
  _id: unknown;
  email?: string | null;
  name?: string | null;
  phoneNumber?: number | null;
  phoneCountryCode?: number | null;
  companyName?: string;
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Mongo $set for inquiry-sourced hire company + contact phone. */
function hireCompanySetFromInquiry(
  profile: HireProfileFromInquiry,
): Record<string, unknown> {
  const $set: Record<string, unknown> = {
    contactName: profile.contactName,
    companyName: profile.companyName,
    industry: profile.industry,
    location: profile.location,
    about: profile.about,
    phoneCountryCode: profile.phoneCountryCode,
    phoneNumber: profile.phoneNumber,
    updatedAt: new Date(),
  };
  if (profile.companySize) $set.companySize = profile.companySize;
  if (profile.website) $set.website = profile.website;
  return $set;
}

/** Drop legacy editable hire fields when locking to inquiry data. */
const LEGACY_HIRE_UNSET = {
  tagline: "" as const,
  certificates: "" as const,
};

export async function applyHireProfileToUserByEmail(
  email: string,
  profile: HireProfileFromInquiry,
): Promise<boolean> {
  await ensureIndexes();
  const normalized = email.trim().toLowerCase();
  const users = client
    .db(DB_NAME)
    .collection<HireUserDoc>(COLLECTIONS.USERS_COLLECTION);

  const existing = await users.findOne({
    email: { $regex: `^${escapeRegex(normalized)}$`, $options: "i" },
  });
  if (!existing) return false;

  const $set = hireCompanySetFromInquiry(profile);
  // Prefer inquiry contact name when the account has no display name yet.
  if (!existing.name?.trim() && profile.contactName) {
    $set.name = profile.contactName;
  }

  await users.updateOne(
    { _id: existing._id as never },
    { $set, $unset: LEGACY_HIRE_UNSET },
  );
  return true;
}

async function applyHireProfileToUserById(
  userId: string,
  profile: HireProfileFromInquiry,
): Promise<boolean> {
  if (!userId) return false;
  await ensureIndexes();
  const users = client
    .db(DB_NAME)
    .collection<HireUserDoc>(COLLECTIONS.USERS_COLLECTION);
  const existing = await users.findOne({ _id: matchId(userId) as never });
  if (!existing) return false;

  const $set = hireCompanySetFromInquiry(profile);
  if (!existing.name?.trim() && profile.contactName) {
    $set.name = profile.contactName;
  }

  await users.updateOne(
    { _id: existing._id as never },
    { $set, $unset: LEGACY_HIRE_UNSET },
  );
  return true;
}

/**
 * If a hire user is missing company fields, copy from their latest approved
 * inquiry (e.g. first login after a pending provision).
 */
export async function hydrateHireProfileFromApprovedInquiry(opts: {
  userId: string;
  email: string;
}): Promise<boolean> {
  await ensureIndexes();
  const users = client
    .db(DB_NAME)
    .collection<HireUserDoc>(COLLECTIONS.USERS_COLLECTION);
  const user = await users.findOne({ _id: matchId(opts.userId) as never });
  if (!user || user.companyName?.trim()) return false;

  const email = (opts.email || user.email || "").trim().toLowerCase();
  if (!email) return false;

  const inquiry = await client
    .db(DB_NAME)
    .collection(COLLECTIONS.RECRUITER_INQUIRIES)
    .findOne(
      { email, status: "approved" },
      { sort: { reviewedAt: -1, updatedAt: -1 } },
    );

  if (!inquiry) return false;

  const profile = hireProfileFromInquiry({
    contactName: String(inquiry.contactName ?? ""),
    companyName: String(inquiry.companyName ?? ""),
    website: String(inquiry.website ?? ""),
    industry: String(inquiry.industry ?? ""),
    companySize: String(inquiry.companySize ?? ""),
    country: String(inquiry.country ?? ""),
    about: String(inquiry.about ?? ""),
    phoneCountryCode: Number(inquiry.phoneCountryCode),
    phoneNumber: Number(inquiry.phoneNumber),
  });

  if (!profile.companyName || !profile.industry) return false;
  return applyHireProfileToUserById(opts.userId, profile);
}

export function inquiryToHireProfile(
  item: Pick<
    RecruiterInquiryListItem,
    | "contactName"
    | "companyName"
    | "website"
    | "industry"
    | "companySize"
    | "country"
    | "about"
    | "phoneCountryCode"
    | "phoneNumber"
  >,
): HireProfileFromInquiry {
  return hireProfileFromInquiry(item);
}
