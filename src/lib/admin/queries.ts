import client, { DB_NAME, COLLECTIONS, isId, matchId } from "@/lib/db";
import type { ProfileType } from "@/lib/profile-types";
import { ensureIndexes } from "@/lib/db/indexes";
import { idHex } from "@/lib/utils";
import {
  deleteUserProvision,
  listUserProvisions,
  upsertUserProvision,
  type ProvisionProfileType,
} from "@/lib/admin/provisions";

export interface AdminUserListItem {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  profileType: ProfileType;
  createdAt: string | null;
  /** True when invited but has not signed in with Google yet. */
  pending: boolean;
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

function pendingId(email: string) {
  return `pending:${email.trim().toLowerCase()}`;
}

function toListItem(
  doc: UserDoc,
  profileType: ProfileType,
  pending = false,
): AdminUserListItem {
  return {
    id: pending ? pendingId(String(doc.email ?? "")) : idHex(doc._id),
    name: doc.name?.trim() || null,
    email: (doc.email ?? "").toLowerCase(),
    image: doc.image ?? null,
    profileType,
    createdAt: toIso(doc.createdAt),
    pending,
  };
}

/** Active users + pending invites for a profile type. */
export async function listUsersByProfileType(
  profileType: ProvisionProfileType,
): Promise<AdminUserListItem[]> {
  await ensureIndexes();
  const [docs, provisions] = await Promise.all([
    client
      .db(DB_NAME)
      .collection<UserDoc>(COLLECTIONS.USERS_COLLECTION)
      .find({ profileType })
      .project<UserDoc>({
        name: 1,
        email: 1,
        image: 1,
        profileType: 1,
        createdAt: 1,
      })
      .sort({ createdAt: -1 })
      .toArray(),
    listUserProvisions(profileType),
  ]);

  const activeEmails = new Set(
    docs.map((doc) => (doc.email ?? "").toLowerCase()).filter(Boolean),
  );

  const active = docs.map((doc) => toListItem(doc, profileType, false));
  const pending = provisions
    .filter((row) => !activeEmails.has(row.email))
    .map((row) =>
      toListItem(
        {
          _id: pendingId(row.email),
          email: row.email,
          name: null,
          image: null,
          createdAt: row.createdAt,
        },
        profileType,
        true,
      ),
    );

  return [...pending, ...active];
}

/**
 * Promote by email: update an existing user, or queue a provision until first
 * Google signup (avoids orphan User docs that can duplicate on login).
 */
export async function upsertUserProfileTypeByEmail(
  email: string,
  profileType: ProvisionProfileType,
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
    // Clear any leftover invite for this email.
    await deleteUserProvision(normalized);
    return {
      item: toListItem({ ...existing, email: normalized }, profileType, false),
      created: false,
    };
  }

  const provision = await upsertUserProvision(normalized, profileType);
  return {
    item: toListItem(
      {
        _id: pendingId(normalized),
        email: normalized,
        name: null,
        image: null,
        createdAt: new Date(),
      },
      profileType,
      true,
    ),
    created: provision.created,
  };
}

/** Change profileType for an existing signed-up user by id. */
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
  return toListItem(result, profileType, false);
}
