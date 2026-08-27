import "server-only";

import type { Document } from "mongodb";
import { recordBaselineNoticeForWorker } from "@/lib/legal-safety/notices";
import client, { COLLECTIONS, DB_NAME, matchId } from "@/lib/db";
import { ensureIndexes } from "@/lib/db/indexes";
import {
  PLATFORM_TERMS_VERSION,
  toUserPreferences,
  USER_PREFERENCE_PROJECTION,
  type UserPreferences,
  type UserPreferencesFields,
  type UserPreferencesUpdate,
  userPreferencesUpdateSchema,
} from "@/lib/user/preferences";
import type { ProfileType } from "@/lib/user/profile-types";
import { formatZodError } from "@/lib/utils";

type UserDoc = UserPreferencesFields & {
  _id: unknown;
  voiceLanguage?: string;
};

function userFilter(userId: string) {
  return { _id: matchId(userId) as never };
}

export async function getUserPreferences(
  userId: string,
): Promise<UserPreferences> {
  await ensureIndexes();
  const user = await client
    .db(DB_NAME)
    .collection<UserDoc>(COLLECTIONS.USERS_COLLECTION)
    .findOne(userFilter(userId), {
      projection: USER_PREFERENCE_PROJECTION,
    });
  return toUserPreferences(user);
}

export async function saveUserPreferences(opts: {
  userId: string;
  profileType: ProfileType;
  patch: UserPreferencesUpdate;
}): Promise<UserPreferences> {
  await ensureIndexes();
  const parsed = userPreferencesUpdateSchema.safeParse(opts.patch);
  if (!parsed.success) {
    throw new Error(formatZodError(parsed.error));
  }

  const collection = client
    .db(DB_NAME)
    .collection<UserDoc>(COLLECTIONS.USERS_COLLECTION);
  const filter = userFilter(opts.userId);

  const $set: Document = {};
  if (parsed.data.cookiesEnabled !== undefined) {
    $set.cookiesEnabled = parsed.data.cookiesEnabled;
  }
  if (parsed.data.notificationsEnabled !== undefined) {
    $set.notificationsEnabled = parsed.data.notificationsEnabled;
  }

  const update: Document[] | { $set: Document } =
    parsed.data.platformTermsAccepted === true
      ? [
          {
            $set: {
              ...$set,
              platformTermsVersion: PLATFORM_TERMS_VERSION,
              platformTermsAcceptedAt: {
                $cond: [
                  {
                    $and: [
                      {
                        $eq: [
                          "$platformTermsVersion",
                          PLATFORM_TERMS_VERSION,
                        ],
                      },
                      { $ne: ["$platformTermsAcceptedAt", null] },
                    ],
                  },
                  "$platformTermsAcceptedAt",
                  "$$NOW",
                ],
              },
            },
          },
        ]
      : { $set };

  const user = await collection.findOneAndUpdate(filter, update as never, {
    returnDocument: "after",
    projection: { ...USER_PREFERENCE_PROJECTION, voiceLanguage: 1 },
  });

  if (
    parsed.data.platformTermsAccepted === true &&
    opts.profileType === "work"
  ) {
    const voiceLanguage =
      user && typeof user.voiceLanguage === "string" ? user.voiceLanguage : null;
    await recordBaselineNoticeForWorker({
      userId: opts.userId,
      languageCode: voiceLanguage,
    });
  }

  return toUserPreferences(user);
}
