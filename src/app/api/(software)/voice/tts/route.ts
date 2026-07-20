import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { resolveTtsLanguage } from "@/lib/voice/languages";
import { sanitizeForTts, TTS_VOICE } from "@/lib/voice/style";

export const maxDuration = 30;

/**
 * Sarvam TTS HTTP stream (Bulbul v3).
 * Proxies the binary audio stream — right fit for Vercel (no persistent WS).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const languageCode = resolveTtsLanguage(
      typeof body?.language_code === "string" ? body.language_code : null,
      TTS_VOICE.languageCode,
    );

    const upstream = await fetch("https://api.sarvam.ai/text-to-speech/stream", {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        target_language_code: languageCode,
        model: TTS_VOICE.model,
        speaker: TTS_VOICE.speaker,
        pace: TTS_VOICE.pace,
        temperature: TTS_VOICE.temperature,
        output_audio_codec: TTS_VOICE.outputAudioCodec,
        output_audio_bitrate: TTS_VOICE.outputAudioBitrate,
      }),
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
        "Content-Type":
          upstream.headers.get("Content-Type") || "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("POST /api/voice/tts:", error);
    return NextResponse.json({ error: "TTS failed" }, { status: 500 });
  }
}
