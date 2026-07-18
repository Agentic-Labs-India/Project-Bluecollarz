"use client";

/** Transcribe a short mic blob via `/api/voice/stt` (Sarvam REST). */
export async function transcribeBlob(
  blob: Blob,
  languageCode = "en-IN",
): Promise<{ transcript?: string; error?: string; ok: boolean }> {
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
      error?: string;
    };
    if (!res.ok || !data.transcript?.trim()) {
      return {
        ok: false,
        error: data.error || "Didn't catch that — speak again.",
      };
    }
    return { ok: true, transcript: data.transcript.trim() };
  } catch {
    return { ok: false, error: "Voice failed. Speak again when ready." };
  }
}
