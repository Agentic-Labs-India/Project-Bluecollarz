import { NextRequest, NextResponse } from "next/server";
import client, { DB_NAME, COLLECTIONS, matchId } from "@/lib/db";
import { requireUser } from "@/lib/api/session";
import { ensureIndexes } from "@/lib/db/indexes";
import {
  toUserPreferences,
  userPreferencesUpdateSchema,
  type UserPreferencesFields,
} from "@/lib/user/preferences";
import { formatZodError } from "@/lib/utils";

type UserDoc = UserPreferencesFields & { _id: unknown };

/** Read cookie / notification prefs for the signed-in user. */
export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    await ensureIndexes();
    const db = client.db(DB_NAME);
    const user = await db
      .collection<UserDoc>(COLLECTIONS.USERS_COLLECTION)
      .findOne({ _id: matchId(auth.user.id) as never });

    return NextResponse.json({ preferences: toUserPreferences(user) });
  } catch (error) {
    console.error("GET /api/user/preferences:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/** Persist cookie / notification prefs on the Users document. */
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

    const $set: UserPreferencesFields = {};
    if (parsed.data.cookiesEnabled !== undefined) {
      $set.cookiesEnabled = parsed.data.cookiesEnabled;
    }
    if (parsed.data.notificationsEnabled !== undefined) {
      $set.notificationsEnabled = parsed.data.notificationsEnabled;
    }

    const db = client.db(DB_NAME);
    const collection = db.collection<UserDoc>(COLLECTIONS.USERS_COLLECTION);
    const filter = { _id: matchId(auth.user.id) as never };

    await collection.updateOne(filter, { $set });
    const user = await collection.findOne(filter);

    return NextResponse.json({ preferences: toUserPreferences(user) });
  } catch (error) {
    console.error("PATCH /api/user/preferences:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
