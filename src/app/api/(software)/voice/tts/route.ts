import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";

export const maxDuration = 30;

/** Sarvam text-to-speech (Bulbul v3). Returns base64 audio. */
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
      typeof body?.text === "string" ? body.text.trim().slice(0, 2400) : "";
    if (!text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const languageCode =
      typeof body?.language_code === "string" && body.language_code
        ? body.language_code
        : "en-IN";

    const res = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        target_language_code: languageCode,
        model: "bulbul:v3",
        // bulbul:v3 speakers — anushka is v2-only
        speaker: "priya",
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("Sarvam TTS error:", res.status, detail);
      return NextResponse.json(
        { error: "Speech synthesis failed" },
        { status: 502 },
      );
    }

    const data = (await res.json()) as { audios?: string[] };
    const audioBase64 = data.audios?.[0];
    if (!audioBase64) {
      return NextResponse.json({ error: "Empty audio response" }, { status: 502 });
    }

    return NextResponse.json({
      audioBase64,
      mimeType: "audio/wav",
    });
  } catch (error) {
    console.error("POST /api/voice/tts:", error);
    return NextResponse.json({ error: "TTS failed" }, { status: 500 });
  }
}
