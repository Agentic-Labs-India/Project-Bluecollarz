"use client";

/** Speak text via Sarvam TTS (/api/voice/tts). Safe to no-op on failure. */
export async function speakText(text: string) {
  const clean = text.replace(/[#*_`]/g, "").trim();
  if (!clean) return;
  const res = await fetch("/api/voice/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: clean.slice(0, 2400),
      language_code: "en-IN",
    }),
  });
  if (!res.ok) return;
  const data = (await res.json()) as { audioBase64?: string; mimeType?: string };
  if (!data.audioBase64) return;
  const audio = new Audio(
    `data:${data.mimeType || "audio/wav"};base64,${data.audioBase64}`,
  );
  await audio.play().catch(() => undefined);
}
