"use client";

import { asUploadableBlob } from "@/lib/native/media-blob";

export type TranscribeResult = {
  ok: boolean;
  transcript?: string;
  language_code?: string | null;
  error?: string;
};

/**
 * Transcribe a short mic blob via `/api/voice/stt` (Sarvam REST).
 * Pass the language the candidate selected in the voice language picker.
 */
export async function transcribeBlob(
  blob: Blob,
  languageCode: string,
): Promise<TranscribeResult> {
  try {
    const contentType = (blob.type || "audio/webm").split(";")[0].trim();
    const ext = contentType.includes("wav")
      ? "wav"
      : contentType.includes("mp4") || contentType.includes("m4a")
        ? "m4a"
        : "webm";
    const audio = await asUploadableBlob(blob, contentType);
    const form = new FormData();
    form.append("audio", audio, `speech.${ext}`);
    form.append("language_code", languageCode);
    const res = await fetch("/api/voice/stt", { method: "POST", body: form });
    const data = (await res.json()) as {
      transcript?: string;
      language_code?: string | null;
      error?: string;
    };
    if (!res.ok || !data.transcript?.trim()) {
      return {
        ok: false,
        error: data.error || "Didn't catch that — speak again.",
      };
    }
    return {
      ok: true,
      transcript: data.transcript.trim(),
      language_code: data.language_code ?? null,
    };
  } catch {
    return { ok: false, error: "Voice failed. Speak again when ready." };
  }
}
