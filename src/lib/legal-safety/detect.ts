import "server-only";

import { recordNoticeDelivery } from "@/lib/legal-safety/notices";
import {
  appendEvidence,
  getOpenCaseForSubject,
  raiseIndicators,
  type S143Indicator,
  type SeriousOffenceCase,
} from "@/lib/legal-safety/serious-offence";

/**
 * Indicator detection over worker-authored text.
 *
 * This is the machine's only move in the serious-offence gate. It reports what
 * the worker described, in the platform's own neutral vocabulary. It does not
 * decide that s.143 is made out, and nothing downstream may read a hit here as
 * that decision (PAD-0001).
 *
 * Deliberately observation-shaped: "the worker says their passport is held" is
 * a fact about the conversation. "This is trafficking" is a finding a court
 * makes, and the platform is not one.
 */

interface IndicatorRule {
  readonly indicator: S143Indicator;
  readonly patterns: readonly RegExp[];
}

/**
 * Hindi patterns avoid `\b` for the same reason as the output lexicon: the
 * boundary is ASCII-only and silently disables the rule.
 */
const RULES: readonly IndicatorRule[] = [
  {
    indicator: "document_retention",
    patterns: [
      /\b(they|he|she|agent|employer|company|boss)\s+(took|kept|keeps|holding|has|have|confiscated)\s+(my|our)\s+(passport|documents?|visa|id)\b/i,
      /\b(my|our)\s+passport\s+(is|was)\s+(taken|kept|held|with\s+them)\b/i,
      /\bwon'?t\s+(give|return)\s+(me\s+)?(my|our)\s+passport\b/i,
      /(पासपोर्ट|कागज़ात|कागजात)\s*(ले\s*लिया|रख\s*लिया|अपने\s*पास)/,
    ],
  },
  {
    indicator: "worker_paid_fee",
    patterns: [
      /\bI\s+(paid|had\s+to\s+pay|was\s+asked\s+to\s+pay)\s+(the\s+)?(agent|him|her|them|a\s+fee|money)\b/i,
      /\bpaid\s+(₹|rs\.?|inr)\s*[\d,]+\s+(to|for)\s+(the\s+)?(agent|job|visa)\b/i,
      /(पैसे|फीस|रुपये)\s+(दिए|देने\s+पड़े|लिए)/,
    ],
  },
  {
    indicator: "debt_bondage_terms",
    patterns: [
      /\b(work|working)\s+(until|till)\s+(the\s+)?(debt|loan|amount)\s+is\s+(paid|cleared)\b/i,
      /\bI\s+owe\s+(them|him|her|the\s+agent)\b/i,
      /\bdeduct(ed|ing)?\s+from\s+my\s+(salary|wages)\s+(until|for\s+the)\s+(loan|debt)\b/i,
      /(कर्ज़|कर्ज|उधार)\s+(चुकाने|उतारने)\s+तक/,
    ],
  },
  {
    indicator: "movement_restriction",
    patterns: [
      /\b(not\s+allowed|can'?t|cannot|won'?t\s+let\s+me)\s+(to\s+)?(leave|go\s+out|go\s+outside|go\s+home)\b/i,
      /\b(locked|confined|kept)\s+(in|inside)\s+(the\s+)?(room|camp|house|accommodation)\b/i,
      /(बाहर\s+नहीं\s+जाने|कमरे\s+में\s+बंद|जाने\s+नहीं\s+देते)/,
    ],
  },
  {
    indicator: "contract_substitution",
    patterns: [
      /\b(the\s+)?(contract|job|work)\s+(was|is)\s+(different|not\s+what)\b[^.!?]{0,40}\b(promised|told|agreed)\b/i,
      /\bthey\s+changed\s+(the\s+)?(contract|terms|salary)\s+(after|when)\s+I\s+(arrived|reached|came)\b/i,
      /(जो\s+बताया\s+था|वादा\s+किया\s+था)[^।!?]{0,40}(अलग|नहीं\s+मिला)/,
    ],
  },
  {
    indicator: "wage_withholding",
    patterns: [
      /\b(not|haven'?t|hasn'?t|never)\s+(been\s+)?(paid|received\s+(my\s+)?(salary|wages))\b/i,
      /\b(salary|wages)\s+(is|are|was|were)\s+(not\s+paid|withheld|pending)\s+for\s+\d+\s+(month|week)/i,
      /(तनख्वाह|सैलरी|वेतन)\s+(नहीं\s+मिली|नहीं\s+दी|रोक\s+ली)/,
    ],
  },
  {
    indicator: "minor_involved",
    patterns: [
      /\bI\s+am\s+(1[0-7]|[1-9])\s+years?\s+old\b/i,
      /\b(he|she|they)\s+(is|are)\s+(1[0-7]|[1-9])\s+years?\s+old\b/i,
      /\bunder\s*[- ]?age(d)?\s+worker\b/i,
    ],
  },
  {
    indicator: "identity_misrepresentation",
    patterns: [
      /\b(fake|forged|false)\s+(passport|visa|contract|documents?|id)\b/i,
      /\bthey\s+(gave|showed|sent)\s+me\s+(a\s+)?(fake|forged)\b/i,
      /(जाली|फर्जी)\s*(पासपोर्ट|वीज़ा|वीजा|कागज़)/,
    ],
  },
  {
    indicator: "isolation_from_contact",
    patterns: [
      /\b(they\s+)?(took|confiscated)\s+(my|our)\s+phone\b/i,
      /\b(not\s+allowed|can'?t|cannot)\s+(to\s+)?(call|contact|speak\s+to)\s+(my\s+)?(family|home|anyone)\b/i,
      /(फ़ोन|फोन)\s+(ले\s+लिया|छीन\s+लिया)/,
    ],
  },
];

export interface DetectionResult {
  readonly indicators: S143Indicator[];
  readonly excerpt: string;
}

/** Neutral observations found in `text`. Never a conclusion. */
export function detectIndicators(text: string): DetectionResult {
  if (!text.trim()) return { indicators: [], excerpt: "" };
  const indicators = RULES.filter((rule) =>
    rule.patterns.some((pattern) => pattern.test(text)),
  ).map((rule) => rule.indicator);
  return { indicators, excerpt: indicators.length > 0 ? text : "" };
}

/**
 * IMMEDIATE-SAFETY OVERRIDE (v0.2). Active danger skips POL-0005 rather than
 * shortening it. Conservative: a miss still falls through to the ordinary notice.
 */
const IMMINENT_HARM: readonly RegExp[] = [
  /\b(they|he|she|boss|agent)\s+(is|are)\s+(beating|hitting|hurting|raping)\s+me\b/i,
  /\b(going\s+to|will)\s+(kill|hurt|beat)\s+me\b/i,
  /\b(locked|trapped)\s+(in|inside)\s+(a\s+)?(room|camp|house)\s+(right\s+now|now|tonight)\b/i,
  /\bhelp\s+me\s+(now|tonight|please)\b[^.!?]{0,40}\b(hit|beat|locked|kill)/i,
  /(अभी|अभी\s+नहीं)\s*(मार|पीट|बंद\s+कर)/,
];

export function detectImminentHarm(text: string): boolean {
  if (!text.trim()) return false;
  return IMMINENT_HARM.some((pattern) => pattern.test(text));
}

/**
 * Scan worker text and, if anything is observed, open or extend a case. Returns
 * the case when one is live so the caller can deliver POL-0005, and null when
 * there is nothing to report.
 *
 * Callers must not branch on *which* indicators fired; that reasoning belongs
 * to the human reviewer.
 */
export async function screenWorkerText(input: {
  userId: string;
  text: string;
  sourceKind: SeriousOffenceCase["evidence"][number]["sourceKind"];
  sourceId: string;
}): Promise<SeriousOffenceCase | null> {
  const { indicators, excerpt } = detectIndicators(input.text);
  if (indicators.length === 0) return null;

  const evidence = {
    sourceKind: input.sourceKind,
    sourceId: input.sourceId,
    excerpt: excerpt.slice(0, 4000),
    capturedAt: new Date(),
  };

  // One case per worker while a review is open, so a reviewer sees the whole
  // picture instead of a case per message.
  const open = await getOpenCaseForSubject(input.userId);
  if (open) {
    await appendEvidence({ caseId: open.caseId, evidence, indicators });
    return open;
  }

  const opened = await raiseIndicators({
    subjectUserId: input.userId,
    indicators,
    evidence: [evidence],
  });

  if (detectImminentHarm(input.text)) {
    await recordNoticeDelivery({
      noticeId: "POL-0005",
      userId: input.userId,
      language: "en-IN",
      bodyShown: "",
      noticeDeferred: true,
    });
  }

  return opened;
}

/** Latest worker-authored text from a UIMessage-shaped array. */
export function lastUserText(messages: unknown): string {
  if (!Array.isArray(messages)) return "";
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message || typeof message !== "object") continue;
    if ((message as { role?: string }).role !== "user") continue;
    const parts = (message as { parts?: unknown }).parts;
    if (Array.isArray(parts)) {
      const text = parts
        .flatMap((part) =>
          part &&
          typeof part === "object" &&
          (part as { type?: string }).type === "text" &&
          typeof (part as { text?: unknown }).text === "string"
            ? [(part as { text: string }).text.trim()]
            : [],
        )
        .filter(Boolean)
        .join(" ");
      if (text) return text;
    }
    const content = (message as { content?: unknown }).content;
    if (typeof content === "string" && content.trim()) return content.trim();
  }
  return "";
}

/** Screen a turn; never throw into the chat path. */
export async function screenWorkerTurnSafe(input: {
  userId: string;
  profileType: string;
  text: string;
  sourceKind: SeriousOffenceCase["evidence"][number]["sourceKind"];
  sourceId: string;
}): Promise<SeriousOffenceCase | null> {
  if (input.profileType !== "work" || !input.text.trim()) return null;
  try {
    return await screenWorkerText(input);
  } catch (error) {
    console.error("[legal-safety] screening failed", error);
    return null;
  }
}
