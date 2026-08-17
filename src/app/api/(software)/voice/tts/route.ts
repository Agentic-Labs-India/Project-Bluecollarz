import { type NextRequest, NextResponse } from "next/server";
import { getAiRuntime } from "@/lib/ai/runtime";
import { resolveTtsLanguage } from "@/lib/ai/voice/languages";
import { sanitizeForTts } from "@/lib/ai/voice/style";
import { requireUser } from "@/lib/auth/session";
import { rateLimitPerMinute, tooManyRequests } from "@/lib/core/rate-limit";

export const maxDuration = 30;

/**
 * Sarvam TTS HTTP stream (Bulbul v3).
 * Proxies the binary audio stream — right fit for Vercel (no persistent WS).
 */
export async function POST(req: NextRequest) {
  try {
    const authed = await requireUser();
    if (!authed.ok) {
      return NextResponse.json(
        { error: authed.error },
        { status: authed.status },
      );
    }
    const limit = rateLimitPerMinute("tts", authed.user.id);
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

    const upstream = await fetch(
      "https://api.sarvam.ai/text-to-speech/stream",
      {
        method: "POST",
        headers: {
          "api-subscription-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          target_language_code: languageCode,
          model: voice.ttsModel,
          speaker: voice.ttsSpeaker,
          pace: voice.ttsPace,
          temperature: voice.ttsTemperature,
          output_audio_codec: voice.ttsCodec,
          output_audio_bitrate: voice.ttsBitrate,
        }),
      },
    );

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
