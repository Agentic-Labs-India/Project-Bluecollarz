import { describe, expect, test } from "bun:test";
import {
  isConsentPlaybackScope,
  noticeTextForScope,
} from "@/lib/compliance/consent-notices";
import { playbackMatchesGrant } from "@/lib/compliance/consent-playback";

describe("consent playback scope", () => {
  test("kyc notice covers DigiLocker, interviews, and fitness — not RA/emigration", () => {
    const text = noticeTextForScope("kyc").toLowerCase();
    expect(text).toContain("digilocker");
    expect(text).toContain("interview");
    expect(text).toContain("fitness");
    expect(text).not.toContain("passport");
    expect(text).not.toContain("emigration");
    expect(text).not.toContain("recruiter");
  });

  test("settings uses the same notice as KYC", () => {
    expect(noticeTextForScope("manage")).toBe(noticeTextForScope("kyc"));
  });

  test("rejects unknown scopes including leftover popup names", () => {
    expect(isConsentPlaybackScope("kyc")).toBe(true);
    expect(isConsentPlaybackScope("manage")).toBe(true);
    expect(isConsentPlaybackScope("evaluation")).toBe(false);
    expect(isConsentPlaybackScope("medical")).toBe(false);
    expect(isConsentPlaybackScope("voice_tap")).toBe(false);
  });
});

describe("playbackMatchesGrant", () => {
  test("kyc or manage playback can grant any non-empty purpose set", () => {
    expect(
      playbackMatchesGrant("kyc", [
        "identity",
        "contact",
        "evaluation",
        "medical",
      ]),
    ).toBe(true);
    expect(playbackMatchesGrant("kyc", ["identity", "contact"])).toBe(true);
    expect(playbackMatchesGrant("manage", ["evaluation"])).toBe(true);
    expect(playbackMatchesGrant("manage", ["medical"])).toBe(true);
  });

  test("empty purposes never match", () => {
    expect(playbackMatchesGrant("manage", [])).toBe(false);
    expect(playbackMatchesGrant("kyc", [])).toBe(false);
  });
});
