import { NextRequest, NextResponse } from "next/server";
import client, { DB_NAME, COLLECTIONS, matchId } from "@/lib/db";
import { requireProfile } from "@/lib/api/session";
import { ensureIndexes } from "@/lib/db/indexes";
import {
  isTtsLanguageCode,
  resolveTtsLanguage,
  type TtsLanguageCode,
} from "@/lib/voice/languages";

/**
 * Set the candidate's Sarvam voice locale (onboarding picker / profile).
 * Body: { language_code: "hi-IN" }
 */
export async function POST(req: NextRequest) {
  const auth = await requireProfile("work");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (!auth.user.id) {
    return NextResponse.json({ error: "Invalid user" }, { status: 400 });
  }

  try {
    await ensureIndexes();
    const body = await req.json().catch(() => null);
    const raw =
      typeof body?.language_code === "string" ? body.language_code.trim() : "";
    if (!raw || !isTtsLanguageCode(raw)) {
      return NextResponse.json(
        { error: "Invalid language_code" },
        { status: 400 },
      );
    }
    const languageCode: TtsLanguageCode = resolveTtsLanguage(raw);

    const db = client.db(DB_NAME);
    await db.collection(COLLECTIONS.USERS_COLLECTION).updateOne(
      { _id: matchId(auth.user.id) as never },
      { $set: { voiceLanguage: languageCode } } as never,
    );

    return NextResponse.json({ ok: true, voiceLanguage: languageCode });
  } catch (error) {
    console.error("POST /api/candidate/voice-language:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
