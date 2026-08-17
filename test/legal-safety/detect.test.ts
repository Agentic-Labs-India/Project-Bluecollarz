import { describe, expect, test } from "bun:test";
import {
  detectImminentHarm,
  detectIndicators,
} from "@/lib/legal-safety/detect";
import { hasProhibitedOutput } from "@/lib/legal-safety/lexicon";
import {
  S143_INDICATORS,
  type S143Indicator,
} from "@/lib/legal-safety/serious-offence";

const OBSERVED: ReadonlyArray<readonly [S143Indicator, string]> = [
  ["document_retention", "The agent took my passport and won't give it back."],
  ["document_retention", "एजेंट ने मेरा पासपोर्ट ले लिया।"],
  ["worker_paid_fee", "I paid the agent 50000 rupees for this job."],
  ["worker_paid_fee", "मुझे फीस देने पड़े।"],
  ["debt_bondage_terms", "They said I must work until the debt is paid."],
  ["movement_restriction", "We are not allowed to leave the accommodation."],
  ["movement_restriction", "वे बाहर नहीं जाने देते।"],
  ["wage_withholding", "I have not been paid for three months."],
  ["isolation_from_contact", "They took my phone when I arrived."],
  ["minor_involved", "I am 16 years old."],
  ["identity_misrepresentation", "They gave me a fake passport."],
  [
    "contract_substitution",
    "The contract was different from what they promised.",
  ],
];

describe("indicator detection", () => {
  for (const [indicator, text] of OBSERVED) {
    test(`observes ${indicator}: ${text.slice(0, 40)}`, () => {
      expect(detectIndicators(text).indicators).toContain(indicator);
    });
  }

  test("ordinary answers raise nothing", () => {
    const benign = [
      "I worked as a welder in Dubai for three years.",
      "My last salary was 2000 dirhams per month.",
      "I can start next month and I have a valid passport.",
      "मैंने दो साल तक निर्माण कार्य किया है।",
      "I left that job because I wanted better pay.",
    ];
    for (const text of benign) {
      expect(detectIndicators(text).indicators).toEqual([]);
    }
  });

  test("every detected indicator is a registered observation", () => {
    for (const [, text] of OBSERVED) {
      for (const indicator of detectIndicators(text).indicators) {
        expect(S143_INDICATORS).toContain(indicator);
      }
    }
  });

  test("multiple indicators can come from one account", () => {
    const text =
      "The agent took my passport. I have not been paid for two months. We are not allowed to leave.";
    expect(detectIndicators(text).indicators.length).toBeGreaterThanOrEqual(3);
  });

  test("detection output carries no conclusion about an offence", () => {
    for (const [, text] of OBSERVED) {
      const result = detectIndicators(text);
      expect(hasProhibitedOutput(result.indicators.join(" "))).toBe(false);
    }
  });

  test("empty text yields no observations", () => {
    expect(detectIndicators("").indicators).toEqual([]);
    expect(detectIndicators("   ").indicators).toEqual([]);
  });
});

describe("immediate-safety override", () => {
  test("detects ongoing violence", () => {
    expect(detectImminentHarm("They are beating me in this camp.")).toBe(true);
  });

  test("ordinary hardship is not imminent harm", () => {
    expect(detectImminentHarm("The agent took my passport last year.")).toBe(
      false,
    );
  });
});
