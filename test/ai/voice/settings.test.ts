import { describe, expect, test } from "bun:test";
import { defaultPlatformSettings } from "@/lib/admin/platform-settings-defaults";
import {
  defaultSpeakerForTtsModel,
  SARVAM_STT_MODES,
  SARVAM_TTS_MODELS,
} from "@/lib/ai/voice/sarvam-options";
import { voiceSettingsSchema } from "@/lib/ai/voice/settings-schema";
import {
  STT_LISTEN_CAP_MS,
  STT_MAX_AUDIO_BYTES,
} from "@/lib/ai/voice/stt-limits";

describe("Sarvam production settings", () => {
  test("defaults match the locked interview voice", () => {
    const voice = defaultPlatformSettings().voice;
    expect(voice).toMatchObject({
      ttsModel: "bulbul:v3",
      ttsSpeaker: "priya",
      ttsTemperature: 0.15,
      ttsPace: 1,
      ttsLanguageCode: "en-IN",
      ttsCodec: "mp3",
      ttsBitrate: "128k",
      sttModel: "saaras:v3",
      sttMode: "transcribe",
    });
    expect(voiceSettingsSchema.safeParse(voice).success).toBe(true);
  });

  test("v3 speaker fallback is priya", () => {
    expect(defaultSpeakerForTtsModel("bulbul:v3")).toBe("priya");
  });

  test("STT mode is transcribe only", () => {
    expect(SARVAM_STT_MODES).toEqual(["transcribe"]);
    expect(SARVAM_TTS_MODELS).not.toContain("bulbul:v4");
  });

  test("REST STT caps match Sarvam's 30s limit", () => {
    expect(STT_LISTEN_CAP_MS).toBe(25_000);
    expect(STT_MAX_AUDIO_BYTES).toBe(3 * 1024 * 1024);
  });

  test("rejects translate, undocumented models, and mismatched speakers", () => {
    const voice = defaultPlatformSettings().voice;
    expect(
      voiceSettingsSchema.safeParse({ ...voice, sttMode: "translate" }).success,
    ).toBe(false);
    expect(
      voiceSettingsSchema.safeParse({ ...voice, ttsModel: "bulbul:v4" })
        .success,
    ).toBe(false);
    expect(
      voiceSettingsSchema.safeParse({ ...voice, ttsSpeaker: "anushka" })
        .success,
    ).toBe(false);
  });
});
