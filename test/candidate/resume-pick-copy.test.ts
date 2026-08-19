import { describe, expect, test } from "bun:test";
import {
  RESUME_PICK_COPY,
  resumePickCopy,
  TTS_LANGUAGE_CODES,
} from "@/lib/ai/voice/languages";

describe("static resume picker copy", () => {
  test("covers every voice language with upload and skip labels", () => {
    expect(Object.keys(RESUME_PICK_COPY).sort()).toEqual(
      [...TTS_LANGUAGE_CODES].sort(),
    );
    for (const code of TTS_LANGUAGE_CODES) {
      const copy = resumePickCopy(code);
      expect(copy.title.length).toBeGreaterThan(8);
      expect(copy.upload.length).toBeGreaterThan(1);
      expect(copy.uploading.length).toBeGreaterThan(1);
      expect(copy.skip.length).toBeGreaterThan(1);
    }
  });

  test("falls back to English for an unknown locale", () => {
    expect(resumePickCopy("xx-XX").skip).toBe("I don't have it");
  });
});
