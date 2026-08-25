import { type NextRequest, NextResponse } from "next/server";
import { getAiRuntime } from "@/lib/ai/runtime";
import { resolveTtsLanguage } from "@/lib/ai/voice/languages";
import { streamSarvamTts } from "@/lib/ai/voice/sarvam-tts";
import { sanitizeForTts } from "@/lib/ai/voice/style";
import { requireUser } from "@/lib/auth/session";
import { rateLimitPerMinute, tooManyRequests } from "@/lib/core/rate-limit";
import { PREFERRED_REGION } from "@/lib/core/region";

export const maxDuration = 30;
export const preferredRegion = PREFERRED_REGION;

/**
 * Cheap reachability check: session + Sarvam key present.
 * Does not synthesize audio.
 */
export async function GET() {
  try {
    const authed = await requireUser();
    if (!authed.ok) {
      return NextResponse.json(
        { error: authed.error },
        { status: authed.status },
      );
    }
    const apiKey = process.env.SARVAM_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "SARVAM_API_KEY is not configured" },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("GET /api/voice/tts:", error);
    return NextResponse.json({ error: "TTS unavailable" }, { status: 500 });
  }
}

/** Proxies Sarvam TTS HTTP stream using Admin voice settings. */
export async function POST(req: NextRequest) {
  try {
    const authed = await requireUser();
    if (!authed.ok) {
      return NextResponse.json(
        { error: authed.error },
        { status: authed.status },
      );
    }
    const limit = await rateLimitPerMinute("tts", authed.user.id);
    if (!limit.ok) return tooManyRequests(limit);

    const apiKey = process.env.SARVAM_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "SARVAM_API_KEY is not configured" },
        { status: 503 },
      );
    }

    const body = await req.json().catch(() => null);
    const text =
      typeof body?.text === "string"
        ? sanitizeForTts(body.text).slice(0, 3500)
        : "";
    if (!text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const settings = await getAiRuntime();
    const voice = settings.voice;
    const languageCode = resolveTtsLanguage(
      typeof body?.language_code === "string" ? body.language_code : null,
      resolveTtsLanguage(voice.ttsLanguageCode),
    );

    const upstream = await streamSarvamTts({
      apiKey,
      text,
      languageCode,
      voice,
    });

    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text().catch(() => "");
      console.error("Sarvam TTS stream error:", upstream.status, detail);
      return NextResponse.json(
        { error: "Speech synthesis failed" },
        { status: 502 },
      );
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("POST /api/voice/tts:", error);
    return NextResponse.json({ error: "TTS failed" }, { status: 500 });
  }
}
