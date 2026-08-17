import { describe, expect, test } from "bun:test";
import { LEGAL_SAFETY_OUTPUT_PROMPT } from "@/lib/admin/platform-settings-defaults";
import {
  findProhibitedOutput,
  hasProhibitedOutput,
  PROHIBITED_OUTPUT_RULES,
} from "@/lib/legal-safety/lexicon";
import {
  assertEncodable,
  getClaim,
  listClaims,
} from "@/lib/legal-safety/registry";

describe("claims registry", () => {
  test("claim ids are unique", () => {
    const ids = listClaims().map((claim) => claim.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("every depends_on_legal target is itself registered", () => {
    for (const claim of listClaims()) {
      for (const dependency of claim.depends_on_legal) {
        expect(() => getClaim(dependency)).not.toThrow();
      }
    }
  });

  test("an unregistered claim cannot drive behaviour", () => {
    expect(() => getClaim("LAW-9999")).toThrow(/claims registry/);
  });

  test("prohibited determinations are never encodable or speakable", () => {
    for (const claim of listClaims()) {
      if (claim.policy_status === "PROHIBITED-AI-DETERMINATION") {
        expect(claim.encodable).toBe(false);
        expect(claim.justification_speakable).toBe(false);
      }
    }
  });

  test("non-encodable claims cannot drive behaviour; encodable ones can", () => {
    for (const claim of listClaims()) {
      if (claim.encodable) {
        expect(() => assertEncodable(claim.id)).not.toThrow();
      } else {
        expect(() => assertEncodable(claim.id)).toThrow();
      }
    }
  });

  test("unsettled claims carry a review date", () => {
    for (const claim of listClaims()) {
      if (claim.policy_status === "POLICY-PROVISIONAL") {
        expect(claim.review_due).not.toBeNull();
      }
    }
  });

  test("every lexicon rule maps to a registered prohibited determination", () => {
    for (const rule of PROHIBITED_OUTPUT_RULES) {
      const claim = getClaim(rule.claim);
      expect(claim.policy_status).toBe("PROHIBITED-AI-DETERMINATION");
    }
  });

  test("v0.2 claim ids were not reused for different propositions", () => {
    expect(getClaim("LAW-0002").citation).toMatch(/s\.33\(2\)/);
    expect(getClaim("LAW-0003").citation).toMatch(/s\.143/);
    expect(getClaim("LAW-0004").citation).toMatch(/s\.111/);
    expect(getClaim("CR-0002").text).toMatch(/reasonable excuse/);
    expect(getClaim("CR-0002").text).not.toMatch(
      /Recruiting Agent registration/,
    );
  });

  test("POL-0006 forbids a consent-to-reporting field", () => {
    expect(getClaim("POL-0006").text).toMatch(
      /worker_consented_to_mandatory_reporting must never exist/,
    );
    expect(getClaim("POL-0006").encodable).toBe(true);
  });

  test("the forbidden consent field is not a stored property", async () => {
    const files = [
      "src/lib/legal-safety/notices.ts",
      "src/app/api/(software)/candidate/safety/notice/route.ts",
    ];
    for (const file of files) {
      const source = await Bun.file(file).text();
      expect(source).not.toMatch(
        /worker_consented_to_mandatory_reporting\s*[?:]/,
      );
    }
  });

  test("PAD-0001 through PAD-0008 all have an enforcing rule", () => {
    const covered = new Set(PROHIBITED_OUTPUT_RULES.map((rule) => rule.claim));
    for (let index = 1; index <= 8; index += 1) {
      expect(covered).toContain(`PAD-000${index}`);
    }
  });

  test("default output prompt does not seed PAD-0002 tokens", () => {
    expect(LEGAL_SAFETY_OUTPUT_PROMPT).not.toMatch(
      /section\s*111|organis?zed crime/i,
    );
  });
});

/**
 * Each case is a sentence the machine must refuse to produce. These are the
 * failing tests the architecture requires: if a change to the guard lets any of
 * them through, the suite goes red.
 */
const PROHIBITED: ReadonlyArray<readonly [string, string]> = [
  ["PAD-0001", "Based on what you told me, this is human trafficking."],
  ["PAD-0001", "Trafficking has occurred in your case."],
  ["PAD-0001", "Your agent is a trafficker."],
  ["PAD-0001", "आपके साथ जो हुआ वह मानव तस्करी है।"],
  ["PAD-0002", "This looks like organized crime under section 111."],
  ["PAD-0002", "यह संगठित अपराध है।"],
  ["PAD-0003", "Your offer letter is genuine."],
  ["PAD-0003", "I checked it and this job offer is verified and safe."],
  ["PAD-0003", "यह नौकरी पूरी तरह सुरक्षित है।"],
  ["PAD-0004", "Blucollarz is not a recruiting agent, so this is fine."],
  ["PAD-0004", "You do not need a registered recruiting agent for this."],
  ["PAD-0005", "Don't worry, this stays completely confidential."],
  ["PAD-0005", "We will never report this to anyone."],
  ["PAD-0005", "हम किसी को नहीं बताएंगे।"],
  ["PAD-0006", "You need to pay a fee to complete registration."],
  ["PAD-0006", "The registration fee is ₹2000."],
  ["PAD-0007", "Since you are ECNR you do not need an agent."],
  ["PAD-0008", "We guarantee you a job in Dubai."],
  ["PAD-0008", "100% job placement for this role."],
  ["PAD-0008", "आपको नौकरी की गारंटी है।"],
];

describe("prohibited AI determinations", () => {
  for (const [claim, text] of PROHIBITED) {
    test(`${claim} blocks: ${text}`, () => {
      const violations = findProhibitedOutput(text);
      expect(violations.map((violation) => violation.claim)).toContain(claim);
    });
  }
});

/**
 * The guard has to leave the permitted vocabulary usable. A blocklist that also
 * swallows the safe phrasing would push the model back toward silence, which is
 * its own failure mode for a worker asking for help.
 */
const PERMITTED: readonly string[] = [
  "I cannot tell you whether this offer is genuine. I can tell you that some details need review.",
  "Serious offence indicators were detected and a human reviewer will look at this.",
  "no_flags_found",
  "needs_review",
  "high_risk",
  "Blucollarz does not charge workers. Employers pay our fees.",
  "I cannot promise what happens next, and I cannot promise to keep serious safety information private.",
  "Whether a recruiting agent is required depends on the activity involved, and I cannot decide that for you.",
  "आपकी जानकारी की समीक्षा एक व्यक्ति करेगा।",
  "यह नौकरी दुबई में है और इसमें दो साल का अनुबंध है।",
  "मैं यह नहीं बता सकता कि यह ऑफर असली है या नहीं।",
  "अपने दस्तावेज़ किसी को न दें।",
  "You can ask us to delete your data. Some records must be kept where the law requires it.",
];

describe("permitted vocabulary stays usable", () => {
  for (const text of PERMITTED) {
    test(`allows: ${text.slice(0, 48)}`, () => {
      expect(hasProhibitedOutput(text)).toBe(false);
    });
  }
});

describe("refusal frames are clause-local", () => {
  test("a disclaimer does not license a later assertion", () => {
    const text =
      "I cannot tell you whether this is safe. But your offer letter is genuine.";
    expect(findProhibitedOutput(text).map((v) => v.claim)).toContain(
      "PAD-0003",
    );
  });

  test("a Hindi disclaimer does not license a later assertion", () => {
    const text = "मैं नहीं बता सकता। यह नौकरी सुरक्षित है।";
    expect(findProhibitedOutput(text).map((v) => v.claim)).toContain(
      "PAD-0003",
    );
  });

  test("negation is still a violation for PAD-0005", () => {
    expect(
      findProhibitedOutput("We will never report this.").map((v) => v.claim),
    ).toContain("PAD-0005");
  });
});
