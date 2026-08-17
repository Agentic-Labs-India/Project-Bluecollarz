/**
 * Prohibited output lexicon for PAD-0001..0008.
 *
 * These are enforced by test and by a runtime guard on model output, not by
 * prompt text. Prompts are admin-editable at runtime, so a prompt cannot be the
 * control that stops the machine making a legal determination.
 */

export interface LexiconRule {
  /** Claim id in the registry this rule enforces. */
  readonly claim: string;
  readonly patterns: readonly RegExp[];
  /**
   * Clause-local refusal frames. A clause matching one of these is the model
   * declining to make the determination, which is the behaviour we want, so it
   * is not a violation. Only set this where the prohibition is on *asserting*
   * something; for PAD-0005 the negation is itself the violation.
   */
  readonly unless?: readonly RegExp[];
  /** Shown to engineers when the guard trips. Never shown to a worker. */
  readonly reason: string;
}

/**
 * Hindi terms are first-class here: the platform speaks eleven Indian
 * languages, so an English-only blocklist would leave the worker-facing
 * surfaces unguarded exactly where workers are most likely to be misled.
 *
 * Devanagari patterns deliberately omit `\b`. JavaScript defines that boundary
 * over ASCII word characters, so it never matches beside a Devanagari letter
 * and silently disables the rule. Those patterns use explicit context instead.
 */
export const PROHIBITED_OUTPUT_RULES: readonly LexiconRule[] = [
  {
    claim: "PAD-0001",
    patterns: [
      /\b(this|that|it)\s+is\s+(human\s+)?trafficking\b/i,
      /\btrafficking\s+has\s+(occurred|taken\s+place|happened)\b/i,
      /\b(you|he|she|they|[A-Z][a-z]+)\s+(is|are|was|were)\s+a?\s*traffickers?\b/i,
      /\byou\s+(have\s+been|were)\s+trafficked\b/i,
      /मानव\s*तस्करी\s*(है|हुई|हुआ)/,
    ],
    reason:
      "States trafficking as fact. Permitted alternative: SERIOUS_OFFENCE_INDICATORS_DETECTED routed to human legal review.",
  },
  {
    claim: "PAD-0002",
    patterns: [
      /\borganis?zed\s+crime\b/i,
      /\bsection\s*111\b/i,
      /\bs\.?\s*111\s+of\s+the\s+BNS\b/i,
      /संगठित\s+अपराध/,
    ],
    reason:
      "Organised-crime classification. s.111 has predicate requirements the platform cannot evaluate.",
  },
  {
    claim: "PAD-0003",
    patterns: [
      /\b(offer\s+letter|job\s+offer|contract)\b[^.!?]{0,60}\b(is\s+)?(genuine|verified|authentic|safe|approved|legitimate)\b/i,
      /\b(genuine|verified|authentic|safe|approved)\s+(offer\s+letter|job\s+offer)\b/i,
      /(नौकरी|काम|ऑफ़?र|प्रस्ताव|कंपनी)[^।!?]{0,40}(सुरक्षित|असली|सही|जांची)\s*(है|हैं)/,
    ],
    unless: [
      /\b(cannot|can't|can\s+not|unable\s+to)\s+(tell|say|confirm|verify)\b/i,
      /\bwhether\b[^।!?]{0,60}\bor\s+not\b/i,
      /नहीं\s+(बता|कह)\s+सकत/,
      /या\s+नहीं/,
    ],
    reason:
      "Vouches for an offer letter. Permitted vocabulary: no_flags_found, needs_review, high_risk.",
  },
  {
    claim: "PAD-0004",
    patterns: [
      /\b(we|blucollarz)\s+(are|is)\s+(not\s+)?a\s+(registered\s+)?recruiting\s+agent\b/i,
      /\b(we|blucollarz)\s+(do|does)\s+not\s+(require|need)\s+(an?\s+)?(RA|recruiting\s+agent)\s+(registration|licence|license)\b/i,
      /\byou\s+do\s+not\s+need\s+a\s+(registered\s+)?recruiting\s+agent\b/i,
    ],
    reason:
      "Legal classification of the platform's own activity or of RA obligation.",
  },
  {
    claim: "PAD-0005",
    patterns: [
      /\b(this|it|what\s+you\s+(say|tell\s+me))\s+(will\s+)?(stay|remain)s?\s+(completely\s+|fully\s+)?(confidential|between\s+us)\b/i,
      /\bwe\s+(will\s+)?(never|not)\s+report\s+(this|it|you)\b/i,
      /\bno\s+one\s+(else\s+)?will\s+(ever\s+)?know\b/i,
      /किसी\s+को\s+(भी\s+)?(नहीं|पता\s+नहीं)\s+(बताएंगे|चलेगा)/,
    ],
    reason:
      "Unconditional confidentiality promise. A statutory duty cannot be waived by the platform.",
  },
  {
    claim: "PAD-0006",
    patterns: [
      /\byou\s+(must|should|need\s+to|have\s+to|can)\s+pay\s+(us|blucollarz|a\s+fee)\b/i,
      /\b(registration|placement|service)\s+fee\s+(of|is)\s+(₹|rs\.?|inr)\s*\d/i,
      /(शुल्क|फीस|पैसे)\s+देना\s+(होगा|पड़ेगा)/,
    ],
    reason: "Suggests a worker-paid fee. Employers pay platform fees.",
  },
  {
    claim: "PAD-0007",
    patterns: [
      /\b(non[-\s]?ECR|ECNR)\b[^.!?]{0,60}\bdo(es)?\s+not\s+(need|require)\b/i,
      /\bbecause\s+you\s+are\s+(non[-\s]?ECR|ECNR)[^.!?]{0,40}\bno\s+(RA|agent)\b/i,
    ],
    reason:
      "Ties RA obligation to ECR/ECNR status. RA obligation is activity-based (LAW-0011).",
  },
  {
    claim: "PAD-0008",
    patterns: [
      /\b(guarantee|guaranteed|assured)\s+(you\s+)?(a\s+)?(job|visa|placement|salary|employment)\b/i,
      /\byou\s+will\s+(definitely|certainly|surely)\s+get\s+(the\s+|a\s+)?(job|visa|placement)\b/i,
      /\b100%\s+(job|visa|placement|selection)\b/i,
      /(नौकरी|वीज़ा|वीजा|प्लेसमेंट)\s+(की\s+)?गारंटी/,
      /पक्की\s+नौकरी/,
    ],
    reason: "Employment, visa, salary or placement guarantee.",
  },
] as const;

export interface LexiconViolation {
  readonly claim: string;
  readonly reason: string;
  readonly match: string;
}

/**
 * Refusal frames are matched per clause rather than per message so that a
 * disclaimer in one sentence cannot license a prohibited assertion in the next.
 */
function clauses(text: string): string[] {
  return text
    .split(/[।.!?\n]+/)
    .map((clause) => clause.trim())
    .filter(Boolean);
}

/** Every prohibited determination present in `text`. */
export function findProhibitedOutput(text: string): LexiconViolation[] {
  if (!text) return [];
  const violations: LexiconViolation[] = [];
  for (const rule of PROHIBITED_OUTPUT_RULES) {
    const hit = clauses(text)
      .filter((clause) => !rule.unless?.some((exempt) => exempt.test(clause)))
      .flatMap((clause) => {
        const found = rule.patterns
          .map((pattern) => clause.match(pattern))
          .find(Boolean);
        return found ? [found[0]] : [];
      })
      .at(0);
    if (hit) {
      violations.push({ claim: rule.claim, reason: rule.reason, match: hit });
    }
  }
  return violations;
}

export function hasProhibitedOutput(text: string): boolean {
  return findProhibitedOutput(text).length > 0;
}
