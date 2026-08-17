/**
 * Sarvam API enums from docs (TTS convert/stream + STT transcribe).
 * https://docs.sarvam.ai/api-reference-docs/text-to-speech/convert
 * https://docs.sarvam.ai/api/api-guides-tutorials/text-to-speech/streaming-api/http-stream
 * https://docs.sarvam.ai/api-reference/speech-to-text/transcribe
 */

export const SARVAM_TTS_MODELS = ["bulbul:v3", "bulbul:v2"] as const;

export const SARVAM_TTS_SPEAKERS_V3 = [
  "shubh",
  "aditya",
  "ritu",
  "priya",
  "neha",
  "rahul",
  "pooja",
  "rohan",
  "simran",
  "kavya",
  "amit",
  "dev",
  "ishita",
  "shreya",
  "ratan",
  "varun",
  "manan",
  "sumit",
  "roopa",
  "kabir",
  "aayan",
  "ashutosh",
  "advait",
  "anand",
  "tanya",
  "tarun",
  "sunny",
  "mani",
  "gokul",
  "vijay",
  "shruti",
  "suhani",
  "mohit",
  "kavitha",
  "rehan",
  "soham",
  "rupali",
] as const;

export const SARVAM_TTS_SPEAKERS_V2 = [
  "anushka",
  "manisha",
  "vidya",
  "arya",
  "abhilash",
  "karun",
  "hitesh",
] as const;

export const SARVAM_TTS_CODECS = [
  "mp3",
  "wav",
  "aac",
  "opus",
  "flac",
  "linear16",
  "mulaw",
  "alaw",
] as const;

export const SARVAM_TTS_BITRATES = [
  "32k",
  "64k",
  "128k",
  "192k",
  "256k",
] as const;

export const SARVAM_STT_MODELS = ["saaras:v3", "saaras:v4"] as const;

export const SARVAM_STT_MODES = [
  "transcribe",
  "translate",
  "verbatim",
  "translit",
  "codemix",
] as const;

export function speakersForTtsModel(model: string): readonly string[] {
  return model === "bulbul:v2"
    ? SARVAM_TTS_SPEAKERS_V2
    : SARVAM_TTS_SPEAKERS_V3;
}

export function defaultSpeakerForTtsModel(model: string): string {
  return model === "bulbul:v2" ? "anushka" : "shubh";
}

export function ttsPaceRange(model: string): { min: number; max: number } {
  return model === "bulbul:v2" ? { min: 0.3, max: 3 } : { min: 0.5, max: 2 };
}
