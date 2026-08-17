import { describe, expect, test } from "bun:test";
import { hasProhibitedOutput } from "@/lib/legal-safety/lexicon";
import {
  getNotice,
  NOTICE_APPROVAL,
  NOTICE_VERSIONS,
  noticeLanguages,
} from "@/lib/legal-safety/notices";
import { getClaim } from "@/lib/legal-safety/registry";

describe("worker-facing notices", () => {
  test("wording is versioned and marked unapproved", () => {
    expect(NOTICE_APPROVAL).toBe("DRAFT-NOT-COUNSEL-APPROVED");
    for (const version of Object.values(NOTICE_VERSIONS)) {
      expect(version).toMatch(/draft-\d+$/);
    }
  });

  test("both notices are registered claims", () => {
    expect(getClaim("POL-0007").policy_status).toBe("POLICY-SETTLED");
    expect(getClaim("POL-0005").policy_status).toBe("POLICY-PROVISIONAL");
  });

  test("notice wording is speakable by the machine", () => {
    for (const id of ["POL-0005", "POL-0007"] as const) {
      expect(getClaim(id).justification_speakable).toBe(true);
    }
  });

  test("an unsupported language fails closed instead of falling back", () => {
    const result = getNotice("POL-0005", "ta-IN");
    expect(result.available).toBe(false);
    if (!result.available) {
      expect(result.reason).toMatch(/Route to a human/);
    }
  });

  test("drafted wording is returned for supported languages", () => {
    for (const id of ["POL-0005", "POL-0007"] as const) {
      for (const language of noticeLanguages(id)) {
        const result = getNotice(id, language);
        expect(result.available).toBe(true);
        if (result.available) {
          expect(result.wording.title.length).toBeGreaterThan(4);
          expect(result.wording.body.length).toBeGreaterThan(40);
          expect(result.wording.continueLabel.length).toBeGreaterThan(2);
        }
      }
    }
  });

  /**
   * The serious-safety notice is the one place the machine talks about
   * reporting, so it is the likeliest place to accidentally promise secrecy.
   */
  test("no notice makes a prohibited determination", () => {
    for (const id of ["POL-0005", "POL-0007"] as const) {
      for (const language of noticeLanguages(id)) {
        const result = getNotice(id, language);
        if (!result.available) continue;
        expect(hasProhibitedOutput(result.wording.body)).toBe(false);
        expect(hasProhibitedOutput(result.wording.title)).toBe(false);
        expect(hasProhibitedOutput(result.wording.continueLabel)).toBe(false);
      }
    }
  });

  test("POL-0005 refuses to promise confidentiality", () => {
    for (const language of noticeLanguages("POL-0005")) {
      const result = getNotice("POL-0005", language);
      if (!result.available) continue;
      expect(result.wording.body).toMatch(/cannot promise|वादा नहीं कर सकता/);
    }
  });

  test("POL-0007 is separate wording from POL-0005", () => {
    const baseline = getNotice("POL-0007", "en-IN");
    const serious = getNotice("POL-0005", "en-IN");
    expect(baseline.available && serious.available).toBe(true);
    if (baseline.available && serious.available) {
      expect(baseline.wording.body).not.toBe(serious.wording.body);
    }
  });
});
