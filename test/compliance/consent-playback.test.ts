import { describe, expect, test } from "bun:test";
import {
  isConsentPlaybackScope,
  noticeTextForScope,
} from "@/lib/compliance/consent-notices";
import { playbackMatchesGrant } from "@/lib/compliance/consent-playback";

describe("consent playback scope", () => {
  test("kyc notice does not mention medical", () => {
    expect(noticeTextForScope("kyc").toLowerCase()).not.toContain("medical");
    expect(noticeTextForScope("kyc").toLowerCase()).not.toContain("fitness");
  });

  test("medical notice is specific to the fitness test", () => {
    expect(noticeTextForScope("medical").toLowerCase()).toContain("fitness");
  });

  test("rejects unknown scopes", () => {
    expect(isConsentPlaybackScope("kyc")).toBe(true);
    expect(isConsentPlaybackScope("voice_tap")).toBe(false);
  });
});

describe("playbackMatchesGrant", () => {
  test("kyc playback cannot grant medical", () => {
    expect(playbackMatchesGrant("kyc", ["medical"])).toBe(false);
    expect(playbackMatchesGrant("kyc", ["identity", "contact"])).toBe(true);
  });

  test("medical playback is only the medical purpose", () => {
    expect(playbackMatchesGrant("medical", ["medical"])).toBe(true);
    expect(playbackMatchesGrant("medical", ["identity", "medical"])).toBe(
      false,
    );
  });

  test("empty purposes never match", () => {
    expect(playbackMatchesGrant("manage", [])).toBe(false);
  });
});
