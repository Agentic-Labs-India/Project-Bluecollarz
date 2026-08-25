import { type NextRequest, NextResponse } from "next/server";
import { getAiRuntime } from "@/lib/ai/runtime";
import { parseTtsLanguage } from "@/lib/ai/voice/languages";
import { STT_MAX_AUDIO_BYTES } from "@/lib/ai/voice/stt-limits";
import { requireUser } from "@/lib/auth/session";
import { rateLimitPerMinute, tooManyRequests } from "@/lib/core/rate-limit";
import { PREFERRED_REGION } from "@/lib/core/region";

export const maxDuration = 30;
export const preferredRegion = PREFERRED_REGION;

/**
 * Sarvam STT REST for VAD clips.
 * REST rejects audio over 30s — VAD caps listen time in `STT_LISTEN_CAP_MS`.
 * Clients must pass the session language_code.
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
    const limit = await rateLimitPerMinute("stt", authed.user.id);
    if (!limit.ok) return tooManyRequests(limit);

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
    if (audio.size > STT_MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { error: "Audio clip is too large" },
        { status: 413 },
      );
    }

    const language = parseTtsLanguage(
      typeof formData.get("language_code") === "string"
        ? String(formData.get("language_code"))
        : null,
    );
    if (!language) {
      return NextResponse.json(
        { error: "Missing language_code" },
        { status: 400 },
      );
    }

    const baseType =
      (audio.type || "audio/webm").split(";")[0].trim() || "audio/webm";
    const filename = audio.name?.includes(".")
      ? audio.name
      : baseType.includes("wav")
        ? "speech.wav"
        : baseType.includes("mp4") || baseType.includes("m4a")
          ? "speech.m4a"
          : baseType.includes("ogg") || baseType.includes("opus")
            ? "speech.ogg"
            : "speech.webm";
    const cleanFile = new File([audio], filename, { type: baseType });

    const settings = await getAiRuntime();
    const voice = settings.voice;

    const sarvamForm = new FormData();
    sarvamForm.append("file", cleanFile, filename);
    sarvamForm.append("model", voice.sttModel);
    sarvamForm.append("mode", voice.sttMode);
    sarvamForm.append("language_code", language);

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

    const data = (await res.json()) as {
      transcript?: string;
      language_code?: string | null;
    };
    const transcript = (data.transcript ?? "").trim();
    if (!transcript) {
      return NextResponse.json(
        { error: "No speech detected. Try again." },
        { status: 422 },
      );
    }

    return NextResponse.json({
      transcript,
      language_code: data.language_code ?? null,
    });
  } catch (error) {
    console.error("POST /api/voice/stt:", error);
    return NextResponse.json({ error: "STT failed" }, { status: 500 });
  }
}
