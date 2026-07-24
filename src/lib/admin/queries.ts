import { ObjectId } from "mongodb";
import client, { DB_NAME, COLLECTIONS, isId, matchId } from "@/lib/db";
import type { ProfileType } from "@/lib/profile-types";
import { ensureIndexes } from "@/lib/db/indexes";
import { idHex } from "@/lib/utils";

export interface AdminUserListItem {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  profileType: ProfileType;
  createdAt: string | null;
}

type UserDoc = {
  _id: unknown;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  profileType?: string | null;
  createdAt?: Date | string | null;
};

function toIso(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value) return value;
  return null;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toListItem(doc: UserDoc, profileType: ProfileType): AdminUserListItem {
  return {
    id: idHex(doc._id),
    name: doc.name?.trim() || null,
    email: (doc.email ?? "").toLowerCase(),
    image: doc.image ?? null,
    profileType,
    createdAt: toIso(doc.createdAt),
  };
}

/** Users filtered by profile type for the admin console. */
export async function listUsersByProfileType(
  profileType: Extract<ProfileType, "hire" | "admin">,
): Promise<AdminUserListItem[]> {
  await ensureIndexes();
  const docs = await client
    .db(DB_NAME)
    .collection<UserDoc>(COLLECTIONS.USERS_COLLECTION)
    .find({ profileType })
    .project({
      name: 1,
      email: 1,
      image: 1,
      profileType: 1,
      createdAt: 1,
    })
    .sort({ createdAt: -1 })
    .toArray();

  return docs.map((doc) => toListItem(doc, profileType));
}

/**
 * Set profileType by email. Creates a stub user when none exists so they can
 * sign in later with Google and inherit the provisioned role via account linking.
 */
export async function upsertUserProfileTypeByEmail(
  email: string,
  profileType: Extract<ProfileType, "hire" | "admin">,
): Promise<{ item: AdminUserListItem; created: boolean }> {
  await ensureIndexes();
  const normalized = email.trim().toLowerCase();
  const users = client
    .db(DB_NAME)
    .collection<UserDoc>(COLLECTIONS.USERS_COLLECTION);

  const existing = await users.findOne({
    email: { $regex: `^${escapeRegex(normalized)}$`, $options: "i" },
  });

  if (existing) {
    await users.updateOne(
      { _id: existing._id as never },
      {
        $set: {
          profileType,
          email: normalized,
          updatedAt: new Date(),
        },
      },
    );
    return {
      item: toListItem({ ...existing, email: normalized }, profileType),
      created: false,
    };
  }

  const now = new Date();
  const _id = new ObjectId();
  const doc: UserDoc & {
    emailVerified: boolean;
    cookiesEnabled: boolean;
    notificationsEnabled: boolean;
    updatedAt: Date;
  } = {
    _id,
    name: normalized.split("@")[0] || null,
    email: normalized,
    emailVerified: true,
    image: null,
    profileType,
    cookiesEnabled: true,
    notificationsEnabled: true,
    createdAt: now,
    updatedAt: now,
  };

  await users.insertOne(doc as never);
  return { item: toListItem(doc, profileType), created: true };
}

/** Change profileType for an existing user by id. */
export async function setUserProfileType(
  userId: string,
  profileType: ProfileType,
): Promise<AdminUserListItem | null> {
  if (!isId(userId)) return null;
  await ensureIndexes();
  const users = client
    .db(DB_NAME)
    .collection<UserDoc>(COLLECTIONS.USERS_COLLECTION);

  const result = await users.findOneAndUpdate(
    { _id: matchId(userId) as never },
    {
      $set: {
        profileType,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" },
  );

  if (!result) return null;
  return toListItem(result, profileType);
}
