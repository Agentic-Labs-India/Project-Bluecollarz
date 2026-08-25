import "server-only";

import type { VoiceSettings } from "@/lib/admin/platform-settings-types";

export const SARVAM_TTS_STREAM_URL =
  "https://api.sarvam.ai/text-to-speech/stream";

export async function streamSarvamTts(input: {
  apiKey: string;
  text: string;
  languageCode: string;
  voice: VoiceSettings;
}): Promise<Response> {
  return fetch(SARVAM_TTS_STREAM_URL, {
    method: "POST",
    headers: {
      "api-subscription-key": input.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: input.text,
      target_language_code: input.languageCode,
      model: input.voice.ttsModel,
      speaker: input.voice.ttsSpeaker,
      pace: input.voice.ttsPace,
      temperature: input.voice.ttsTemperature,
      output_audio_codec: input.voice.ttsCodec,
      output_audio_bitrate: input.voice.ttsBitrate,
    }),
  });
}
