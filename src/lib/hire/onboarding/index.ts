import "server-only";
import { cache } from "react";
import { ObjectId } from "mongodb";
import client, { COLLECTIONS, DB_NAME, isId, matchId, matchIds } from "@/lib/db";
import { ensureIndexes } from "@/lib/db/indexes";
import { deleteBlobUrls } from "@/lib/blob/delete";
import {
  blobPathRelativeToRoot,
  isCompanyDocumentRelativePath,
  isVercelBlobUrl,
} from "@/lib/blob/pathname";
import {
  emptyHireOnboardingSave,
  hireOnboardingSaveSchema,
  isHireOnboardingComplete,
  isHireOnboardingEditable,
  isHireOnboardingVerified,
  type HireOnboardingData,
  type HireOnboardingDocument,
  type HireOnboardingListItem,
  type HireOnboardingSaveInput,
  type HireOnboardingStatus,
} from "@/lib/hire/onboarding/types";
import {
  lockAccessRequestFields,
  seedHireOnboardingFromUser,
  type HireOnboardingUser,
} from "@/lib/hire/onboarding/access-request";
import type { HireProfileFields } from "@/lib/hire/profile";
import { idHex } from "@/lib/utils";

type HireOnboardingDoc = HireOnboardingSaveInput & {
  _id: ObjectId;
  userId: ObjectId | string;
  status: HireOnboardingStatus;
  adminNote: string;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  reviewedById: string | null;
  reviewedByEmail: string | null;
  reviewedByName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type HireUserLite = HireProfileFields &
  HireOnboardingUser & {
    _id: unknown;
  };

function collection() {
  return client
    .db(DB_NAME)
    .collection<HireOnboardingDoc>(COLLECTIONS.HIRE_ONBOARDINGS);
}

function toIso(value: Date | null | undefined): string | null {
  return value instanceof Date ? value.toISOString() : null;
}

function collectDocumentUrls(data: HireOnboardingSaveInput): string[] {
  const urls: string[] = [];
  if (data.documents.establishmentCard?.url) {
    urls.push(data.documents.establishmentCard.url);
  }
  if (data.documents.immigrationFile?.url) {
    urls.push(data.documents.immigrationFile.url);
  }
  for (const licence of data.legalLicences) {
    if (licence.document?.url) urls.push(licence.document.url);
  }
  return urls;
}

function assertOwnCompanyDocument(
  doc: HireOnboardingDocument | null,
  userId: string,
): void {
  if (!doc) return;
  if (!isVercelBlobUrl(doc.url)) {
    throw new Error("Document must be stored on Vercel Blob");
  }
  const relative = blobPathRelativeToRoot(doc.pathname);
  if (!relative || !isCompanyDocumentRelativePath(relative, userId)) {
    throw new Error("Document path is not under your company folder");
  }
}

function assertOwnDocuments(data: HireOnboardingSaveInput, userId: string) {
  assertOwnCompanyDocument(data.documents.establishmentCard, userId);
  assertOwnCompanyDocument(data.documents.immigrationFile, userId);
  for (const licence of data.legalLicences) {
    assertOwnCompanyDocument(licence.document, userId);
  }
}

function toData(doc: HireOnboardingDoc): HireOnboardingData {
  const empty = emptyHireOnboardingSave();
  return {
    id: idHex(doc._id),
    userId: idHex(doc.userId),
    status: doc.status,
    adminNote: doc.adminNote || "",
    submittedAt: toIso(doc.submittedAt),
    reviewedAt: toIso(doc.reviewedAt),
    reviewedByEmail: doc.reviewedByEmail,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    identity: { ...empty.identity, ...doc.identity },
    location: { ...empty.location, ...doc.location },
    contacts: {
      owner: { ...empty.contacts.owner, ...doc.contacts?.owner },
      hr: { ...empty.contacts.hr, ...doc.contacts?.hr },
      operations: { ...empty.contacts.operations, ...doc.contacts?.operations },
      finance: { ...empty.contacts.finance, ...doc.contacts?.finance },
      immigration: {
        ...empty.contacts.immigration,
        ...doc.contacts?.immigration,
      },
    },
    gccRules: { ...empty.gccRules, ...doc.gccRules },
    sponsorshipLicence: {
      ...empty.sponsorshipLicence,
      ...doc.sponsorshipLicence,
    },
    legalLicences: Array.isArray(doc.legalLicences) ? doc.legalLicences : [],
    documents: {
      establishmentCard: doc.documents?.establishmentCard ?? null,
      immigrationFile: doc.documents?.immigrationFile ?? null,
    },
  };
}

function toClient(
  doc: HireOnboardingDoc,
  user: HireUserLite | null,
): HireOnboardingData {
  const data = toData(doc);
  return { ...data, ...lockAccessRequestFields(data, user) };
}

function toListItem(
  doc: HireOnboardingDoc,
  user: HireUserLite | null,
): HireOnboardingListItem {
  const data = toData(doc);
  return {
    ...data,
    companyName:
      data.identity.legalName.trim() || user?.companyName?.trim() || "Company",
    email: (user?.email || "").trim().toLowerCase(),
    contactName:
      data.contacts.owner.name.trim() ||
      user?.contactName?.trim() ||
      user?.name?.trim() ||
      "",
  };
}

async function loadUser(userId: string): Promise<HireUserLite | null> {
  return client
    .db(DB_NAME)
    .collection<HireUserLite>(COLLECTIONS.USERS_COLLECTION)
    .findOne({ _id: matchId(userId) as never });
}

export async function getOrCreateHireOnboarding(
  userId: string,
): Promise<HireOnboardingData> {
  if (!isId(userId)) throw new Error("Invalid user");
  await ensureIndexes();

  const [user, existing] = await Promise.all([
    loadUser(userId),
    collection().findOne({
      userId: matchId(userId) as never,
    }),
  ]);
  if (existing) return toClient(existing, user);

  const now = new Date();
  const doc: HireOnboardingDoc = {
    _id: new ObjectId(),
    userId: new ObjectId(userId),
    status: "draft",
    adminNote: "",
    submittedAt: null,
    reviewedAt: null,
    reviewedById: null,
    reviewedByEmail: null,
    reviewedByName: null,
    createdAt: now,
    updatedAt: now,
    ...seedHireOnboardingFromUser(user),
  };
  try {
    await collection().insertOne(doc);
    return toData(doc);
  } catch (error) {
    const code = (error as { code?: number }).code;
    if (code !== 11000) throw error;
    const raced = await collection().findOne({
      userId: matchId(userId) as never,
    });
    if (!raced) throw error;
    return toClient(raced, user);
  }
}

export async function getHireOnboarding(
  userId: string,
): Promise<HireOnboardingData | null> {
  if (!isId(userId)) return null;
  await ensureIndexes();
  const [user, existing] = await Promise.all([
    loadUser(userId),
    collection().findOne({
      userId: matchId(userId) as never,
    }),
  ]);
  if (!existing) return null;
  return toClient(existing, user);
}

export async function saveHireOnboarding(opts: {
  userId: string;
  payload: HireOnboardingSaveInput;
}): Promise<HireOnboardingData> {
  if (!isId(opts.userId)) throw new Error("Invalid user");
  await ensureIndexes();

  const [user, current] = await Promise.all([
    loadUser(opts.userId),
    collection().findOne({
      userId: matchId(opts.userId) as never,
    }),
  ]);
  const parsed = lockAccessRequestFields(
    hireOnboardingSaveSchema.parse(opts.payload),
    user,
  );
  assertOwnDocuments(parsed, opts.userId);

  if (!current) throw new Error("Onboarding not found");
  if (!isHireOnboardingEditable(current.status)) {
    throw new Error("Company onboarding is locked while under review");
  }

  const stale = collectDocumentUrls(toData(current)).filter(
    (url) => !collectDocumentUrls(parsed).includes(url),
  );
  if (stale.length) await deleteBlobUrls(stale);

  const now = new Date();
  const $set: Record<string, unknown> = {
    ...parsed,
    updatedAt: now,
  };

  const updated = await collection().findOneAndUpdate(
    { _id: current._id },
    { $set },
    { returnDocument: "after" },
  );
  if (!updated) throw new Error("Onboarding not found");
  return toData(updated);
}

export async function submitHireOnboarding(
  userId: string,
): Promise<HireOnboardingData> {
  if (!isId(userId)) throw new Error("Invalid user");
  await ensureIndexes();

  const current = await getOrCreateHireOnboarding(userId);
  if (!isHireOnboardingEditable(current.status)) {
    throw new Error("Company onboarding is locked while under review");
  }
  if (!isHireOnboardingComplete(current)) {
    throw new Error("Complete required company fields before submitting");
  }

  const now = new Date();
  const updated = await collection().findOneAndUpdate(
    { _id: matchId(current.id) as never },
    {
      $set: {
        status: "submitted",
        submittedAt: now,
        updatedAt: now,
        adminNote: "",
      },
    },
    { returnDocument: "after" },
  );
  if (!updated) throw new Error("Onboarding not found");
  return toData(updated);
}

export const getHireOnboardingStatus = cache(
  async (userId: string): Promise<HireOnboardingStatus | null> => {
    if (!isId(userId)) return null;
    await ensureIndexes();
    const doc = await collection().findOne(
      { userId: matchId(userId) as never },
      { projection: { status: 1 } },
    );
    return doc?.status ?? null;
  },
);

export async function isHireCompanyVerified(userId: string): Promise<boolean> {
  const status = await getHireOnboardingStatus(userId);
  return isHireOnboardingVerified(status);
}

export async function listHireOnboardings(opts?: {
  status?: HireOnboardingStatus | "all";
  limit?: number;
}): Promise<{ items: HireOnboardingListItem[] }> {
  await ensureIndexes();
  const limit = Math.min(Math.max(opts?.limit ?? 100, 1), 200);
  const filter =
    opts?.status && opts.status !== "all" ? { status: opts.status } : {};
  const docs = await collection()
    .find(filter)
    .sort({ submittedAt: -1, updatedAt: -1 })
    .limit(limit)
    .toArray();

  const userIds = docs.map((doc) => idHex(doc.userId)).filter(Boolean);
  const users = userIds.length
    ? await client
        .db(DB_NAME)
        .collection<HireUserLite>(COLLECTIONS.USERS_COLLECTION)
        .find({ _id: { $in: matchIds(userIds) } as never })
        .project({
          email: 1,
          name: 1,
          companyName: 1,
          contactName: 1,
        })
        .toArray()
    : [];
  const byId = new Map(
    (users as HireUserLite[]).map((user) => [idHex(user._id), user]),
  );

  return {
    items: docs.map((doc) =>
      toListItem(doc, byId.get(idHex(doc.userId)) ?? null),
    ),
  };
}

export async function reviewHireOnboarding(opts: {
  id: string;
  status: "verified" | "rejected";
  adminNote?: string;
  reviewer: { id: string; email: string; name?: string | null };
}): Promise<HireOnboardingListItem | null> {
  if (!isId(opts.id)) return null;
  await ensureIndexes();
  const existing = await collection().findOne({
    _id: matchId(opts.id) as never,
  });
  if (!existing) return null;
  if (existing.status !== "submitted") {
    throw new Error(`Onboarding is already ${existing.status}`);
  }
  const note = (opts.adminNote || "").trim();
  if (opts.status === "rejected" && note.length < 8) {
    throw new Error("Describe the changes required");
  }

  const now = new Date();
  const updated = await collection().findOneAndUpdate(
    { _id: existing._id },
    {
      $set: {
        status: opts.status,
        adminNote: note,
        reviewedAt: now,
        reviewedById: opts.reviewer.id,
        reviewedByEmail: opts.reviewer.email.trim().toLowerCase(),
        reviewedByName: opts.reviewer.name?.trim() || null,
        updatedAt: now,
      },
    },
    { returnDocument: "after" },
  );
  if (!updated) return null;
  const user = await loadUser(idHex(updated.userId));
  return toListItem(updated, user);
}
