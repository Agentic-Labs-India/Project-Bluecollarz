import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";

export const maxDuration = 30;

/**
 * Sarvam STT REST (Saaras v3) for short VAD clips (≤30s).
 * REST accepts webm/opus directly — better on Vercel than WS + WAV convert.
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

    const formData = await req.formData();
    const audio = formData.get("audio");
    if (!(audio instanceof File) || audio.size === 0) {
      return NextResponse.json({ error: "Missing audio" }, { status: 400 });
    }

    // Sarvam rejects MIME types with codec params (e.g. audio/webm;codecs=opus)
    const baseType =
      (audio.type || "audio/webm").split(";")[0].trim() || "audio/webm";
    const filename =
      audio.name && audio.name.includes(".")
        ? audio.name
        : baseType.includes("wav")
          ? "speech.wav"
          : baseType.includes("mp4") || baseType.includes("m4a")
            ? "speech.m4a"
            : baseType.includes("ogg") || baseType.includes("opus")
              ? "speech.ogg"
              : "speech.webm";
    const cleanFile = new File([audio], filename, { type: baseType });

    const sarvamForm = new FormData();
    sarvamForm.append("file", cleanFile, filename);
    sarvamForm.append("model", "saaras:v3");
    sarvamForm.append("mode", "transcribe");

    const language = formData.get("language_code");
    if (typeof language === "string" && language) {
      sarvamForm.append("language_code", language);
    }

    const res = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: { "api-subscription-key": apiKey },
      body: sarvamForm,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("Sarvam STT error:", res.status, detail);
      return NextResponse.json(
        { error: "Speech recognition failed" },
        { status: 502 },
      );
    }

    const data = (await res.json()) as { transcript?: string };
    const transcript = (data.transcript ?? "").trim();
    if (!transcript) {
      return NextResponse.json(
        { error: "No speech detected. Try again." },
        { status: 422 },
      );
    }

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error("POST /api/voice/stt:", error);
    return NextResponse.json({ error: "STT failed" }, { status: 500 });
  }
}
