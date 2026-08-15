import client, { DB_NAME, COLLECTIONS } from "@/lib/db";
import type { ProfileType } from "@/lib/user/profile-types";

export type ProvisionProfileType = Extract<ProfileType, "hire" | "admin">;

type ProvisionDoc = {
  email: string;
  profileType: ProvisionProfileType;
  createdAt: Date;
  updatedAt: Date;
};

function provisions() {
  return client
    .db(DB_NAME)
    .collection<ProvisionDoc>(COLLECTIONS.USER_PROVISIONS);
}

/** Queue a hire/admin role for an email that has not signed up yet. */
export async function upsertUserProvision(
  email: string,
  profileType: ProvisionProfileType,
): Promise<{ email: string; profileType: ProvisionProfileType; created: boolean }> {
  const normalized = email.trim().toLowerCase();
  const now = new Date();
  const existing = await provisions().findOne({ email: normalized });

  await provisions().updateOne(
    { email: normalized },
    {
      $set: {
        email: normalized,
        profileType,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );

  return {
    email: normalized,
    profileType,
    created: !existing,
  };
}

export async function listUserProvisions(
  profileType: ProvisionProfileType,
): Promise<Array<{ email: string; profileType: ProvisionProfileType; createdAt: Date }>> {
  const docs = await provisions()
    .find({ profileType })
    .sort({ createdAt: -1 })
    .toArray();

  return docs.map((doc) => ({
    email: doc.email.toLowerCase(),
    profileType: doc.profileType,
    createdAt: doc.createdAt,
  }));
}

/** Remove a pending invite (demote before first login). */
export async function deleteUserProvision(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  const result = await provisions().deleteOne({ email: normalized });
  return result.deletedCount > 0;
}

/**
 * Apply and consume a pending provision on first Google signup.
 * Returns the provisioned profile type, or null when none exists.
 */
export async function consumeUserProvision(
  email: string,
): Promise<ProvisionProfileType | null> {
  const normalized = email.trim().toLowerCase();
  const doc = await provisions().findOneAndDelete({ email: normalized });
  return doc?.profileType ?? null;
}
