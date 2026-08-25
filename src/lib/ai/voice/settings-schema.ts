import { z } from "zod";
import { TTS_LANGUAGE_CODES } from "@/lib/ai/voice/languages";
import {
  SARVAM_STT_MODELS,
  SARVAM_STT_MODES,
  SARVAM_TTS_BITRATES,
  SARVAM_TTS_CODECS,
  SARVAM_TTS_MODELS,
  speakersForTtsModel,
  ttsPaceRange,
} from "@/lib/ai/voice/sarvam-options";

export const voiceSettingsSchema = z
  .object({
    ttsModel: z.enum(SARVAM_TTS_MODELS),
    ttsSpeaker: z.string().trim().min(1).max(80),
    ttsTemperature: z.number().min(0.01).max(2),
    ttsPace: z.number().min(0.3).max(3),
    ttsLanguageCode: z.enum(TTS_LANGUAGE_CODES),
    ttsCodec: z.enum(SARVAM_TTS_CODECS),
    ttsBitrate: z.enum(SARVAM_TTS_BITRATES),
    sttModel: z.enum(SARVAM_STT_MODELS),
    sttMode: z.enum(SARVAM_STT_MODES),
  })
  .superRefine((value, ctx) => {
    const speakers = speakersForTtsModel(value.ttsModel);
    if (!speakers.includes(value.ttsSpeaker)) {
      ctx.addIssue({
        code: "custom",
        message: "Speaker is not valid for this TTS model",
        path: ["ttsSpeaker"],
      });
    }
    const pace = ttsPaceRange(value.ttsModel);
    if (value.ttsPace < pace.min || value.ttsPace > pace.max) {
      ctx.addIssue({
        code: "custom",
        message: "Pace is outside the range for this TTS model",
        path: ["ttsPace"],
      });
    }
  });

export type VoiceSettingsParsed = z.infer<typeof voiceSettingsSchema>;
