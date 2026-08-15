"use client";

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
    const form = new FormData();
    const ext = blob.type.includes("wav")
      ? "wav"
      : blob.type.includes("mp4") || blob.type.includes("m4a")
        ? "m4a"
        : "webm";
    form.append("audio", blob, `speech.${ext}`);
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
