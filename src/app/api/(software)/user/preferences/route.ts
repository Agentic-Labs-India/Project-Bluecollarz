import type { Document } from "mongodb";
import { type NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import client, { COLLECTIONS, DB_NAME, matchId } from "@/lib/db";
import { ensureIndexes } from "@/lib/db/indexes";
import { recordBaselineNoticeForWorker } from "@/lib/legal-safety/notices";
import {
  PLATFORM_TERMS_VERSION,
  toUserPreferences,
  USER_PREFERENCE_PROJECTION,
  type UserPreferencesFields,
  userPreferencesUpdateSchema,
} from "@/lib/user/preferences";
import { formatZodError } from "@/lib/utils";

type UserDoc = UserPreferencesFields & {
  _id: unknown;
  voiceLanguage?: string;
};

function userFilter(userId: string) {
  return { _id: matchId(userId) as never };
}

/** Read cookie / notification / terms prefs for the signed-in user. */
export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    await ensureIndexes();
    const user = await client
      .db(DB_NAME)
      .collection<UserDoc>(COLLECTIONS.USERS_COLLECTION)
      .findOne(userFilter(auth.user.id), {
        projection: USER_PREFERENCE_PROJECTION,
      });

    return NextResponse.json({ preferences: toUserPreferences(user) });
  } catch (error) {
    console.error("GET /api/user/preferences:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

/** Persist cookie / notification / terms prefs on the Users document. */
export async function PATCH(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    await ensureIndexes();
    const body = await req.json().catch(() => null);
    const parsed = userPreferencesUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }

    const collection = client
      .db(DB_NAME)
      .collection<UserDoc>(COLLECTIONS.USERS_COLLECTION);
    const filter = userFilter(auth.user.id);

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
      auth.user.profileType === "work"
    ) {
      try {
        const voiceLanguage =
          user && typeof user.voiceLanguage === "string"
            ? user.voiceLanguage
            : null;
        await recordBaselineNoticeForWorker({
          userId: auth.user.id,
          languageCode: voiceLanguage,
        });
      } catch (error) {
        console.error("POL-0007 delivery on terms accept:", error);
      }
    }

    return NextResponse.json({ preferences: toUserPreferences(user) });
  } catch (error) {
    console.error("PATCH /api/user/preferences:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
