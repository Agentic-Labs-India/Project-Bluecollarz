import type { TtsLanguageCode } from "@/lib/voice/languages";

/** Shared TTS delivery settings — keep every utterance sounding the same. */
export const TTS_VOICE = {
  model: "bulbul:v3",
  speaker: "priya",
  /** Lower = steadier, less emotional swing (v3 range 0.01–2.0, default 0.6). */
  temperature: 0.15,
  pace: 1,
  /** Fallback before Sarvam STT detects the candidate's language. */
  languageCode: "en-IN" as TtsLanguageCode,
  outputAudioCodec: "mp3",
  outputAudioBitrate: "128k",
} as const;

/**
 * Prompt block for any voice agent whose replies are spoken by TTS.
 * Bulbul v3 infers emotion from the words — keep copy calm and even.
 */
export const VOICE_DELIVERY_PROMPT = `Voice delivery (critical — every reply is spoken aloud by TTS):
- Keep a calm, warm, professional tone in every turn. Same energy start to finish.
- Do not sound excited, sad, theatrical, or hyper. No cheerleading.
- Never use exclamation marks, ALL CAPS, emoji, or filler hype ("wow", "amazing", "so excited").
- Prefer plain sentences ending with a period. Ask one clear question at a time.`;

/** Normalize text before TTS so punctuation doesn't swing prosody. */
export function sanitizeForTts(text: string): string {
  return text
    .replace(/[#*_`~]/g, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/!+/g, ".")
    .replace(/\?{2,}/g, "?")
    .replace(/\.{3,}/g, ".")
    .replace(/\s+/g, " ")
    .trim();
}
