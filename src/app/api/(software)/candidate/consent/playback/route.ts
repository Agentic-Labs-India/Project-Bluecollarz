import { NextResponse } from "next/server";
import { z } from "zod";
import { getAiRuntime } from "@/lib/ai/runtime";
import { resolveTtsLanguage } from "@/lib/ai/voice/languages";
import { streamSarvamTts } from "@/lib/ai/voice/sarvam-tts";
import { sanitizeForTts } from "@/lib/ai/voice/style";
import { requireProfile, rethrowIfPrerenderAbort } from "@/lib/auth/session";
import {
  isConsentPlaybackScope,
  noticeTextForScope,
} from "@/lib/compliance/consent-notices";
import { issueConsentPlayback } from "@/lib/compliance/consent-playback";
import { rateLimitPerMinute, tooManyRequests } from "@/lib/core/rate-limit";
import { PREFERRED_REGION } from "@/lib/core/region";
import client, { COLLECTIONS, DB_NAME, matchId } from "@/lib/db";
import { ensureIndexes } from "@/lib/db/indexes";
import { formatZodError } from "@/lib/utils";

export const preferredRegion = PREFERRED_REGION;

const bodySchema = z.object({
  scope: z.string().trim().min(1),
});

/**
 * Issues a single-use playback id and speaks the official notice for that
 * scope. Grant will not accept a client `voice_tap` flag without this id.
 */
export async function POST(req: Request) {
  try {
    await ensureIndexes();
    const auth = await requireProfile("work");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const limit = await rateLimitPerMinute("consentPlayback", auth.user.id);
    if (!limit.ok) return tooManyRequests(limit);

    const body = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }
    if (!isConsentPlaybackScope(parsed.data.scope)) {
      return NextResponse.json({ error: "Unknown notice" }, { status: 400 });
    }

    const text = sanitizeForTts(noticeTextForScope(parsed.data.scope));
    const playback = await issueConsentPlayback({
      userId: auth.user.id,
      scope: parsed.data.scope,
    });

    const apiKey = process.env.SARVAM_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        {
          playbackId: playback.playbackId,
          text,
          audio: false,
        },
        {
          status: 200,
          headers: { "X-Consent-Playback-Id": playback.playbackId },
        },
      );
    }

    const user = await client
      .db(DB_NAME)
      .collection<{ voiceLanguage?: string }>(COLLECTIONS.USERS_COLLECTION)
      .findOne(
        { _id: matchId(auth.user.id) as never },
        { projection: { voiceLanguage: 1 } },
      );

    const settings = await getAiRuntime();
    const languageCode = resolveTtsLanguage(
      typeof user?.voiceLanguage === "string" ? user.voiceLanguage : null,
      resolveTtsLanguage(settings.voice.ttsLanguageCode),
    );

    const upstream = await streamSarvamTts({
      apiKey,
      text,
      languageCode,
      voice: settings.voice,
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        {
          playbackId: playback.playbackId,
          text,
          audio: false,
        },
        {
          status: 200,
          headers: { "X-Consent-Playback-Id": playback.playbackId },
        },
      );
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "audio/mpeg",
        "Cache-Control": "no-store",
        "X-Consent-Playback-Id": playback.playbackId,
      },
    });
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    console.error("POST /api/candidate/consent/playback:", error);
    return NextResponse.json(
      { error: "Could not play notice" },
      { status: 500 },
    );
  }
}
