import { isToolUIPart, type UIMessage } from "ai";
import { uiMessageText } from "@/lib/ai/ui-message-text";
import { languageLabel, parseTtsLanguage } from "@/lib/ai/voice/languages";
import {
  CANDIDATE_FIELD_LABELS,
  type CandidateMandatoryField,
  type CandidateProfileData,
  type EducationFormEntry,
  emptyCandidateProfileData,
  toCandidateProfileData,
  type WorkFormEntry,
} from "@/lib/candidate/profile";

export const ONBOARDING_STAGE_FIELDS = [
  "voiceLanguage",
  "headline",
  "yearsExperience",
  "education",
  "workExperience",
  "languages",
  "summary",
] as const;

export type OnboardingStageField = (typeof ONBOARDING_STAGE_FIELDS)[number];

export const ONBOARDING_STAGE_LABELS: Record<OnboardingStageField, string> = {
  voiceLanguage: "Voice language",
  headline: "Currently working as",
  yearsExperience: "Years of experience",
  education: "Education",
  workExperience: "Work experience",
  languages: "Languages",
  summary: "Professional summary",
};

const UPDATE_TOOL = "tool-updateCandidateProfile";
const GET_TOOL = "tool-getCandidateProfile";
const FINISH_TOOL = "tool-finishOnboarding";
const LANG_TOOL = "tool-selectVoiceLanguage";

const LABEL_TO_FIELD = new Map<string, OnboardingStageField>(
  (
    Object.entries(CANDIDATE_FIELD_LABELS) as Array<
      [CandidateMandatoryField, string]
    >
  ).map(([key, label]) => [label.toLowerCase(), key]),
);

const ASK_HINTS: Array<{ key: OnboardingStageField; pattern: RegExp }> = [
  {
    key: "summary",
    pattern:
      /\b(summary|digilocker|kyc|profile is complete|all set|onboarding is complete)\b/i,
  },
  {
    key: "voiceLanguage",
    pattern: /\b(which language should we use|pick (?:a |your )?language)\b/i,
  },
  {
    key: "languages",
    pattern:
      /\b(languages you speak|which languages do you|spoken languages|languages can you speak)\b/i,
  },
  {
    key: "education",
    pattern:
      /\b(school|college|education|degree|stud(?:y|ied)|university|polytechnic|class|12th|10th)\b/i,
  },
  {
    key: "workExperience",
    pattern:
      /\b(compan(?:y|ies)|employer|work experience|where (?:did|do) you work|previous (?:job|role)|last job)\b/i,
  },
  {
    key: "yearsExperience",
    pattern:
      /\b(years? of experience|how many years|how long have you (?:been |worked)|total experience)\b/i,
  },
  {
    key: "headline",
    pattern:
      /\b(currently working|current (?:role|job|title)|what do you do|job title|headline|working as)\b/i,
  },
];

export type OnboardingStageSnapshot = {
  values: Record<OnboardingStageField, string>;
  asking: OnboardingStageField | null;
  writing: OnboardingStageField[];
  missing: OnboardingStageField[];
};

function formatYearRange(
  startYear: number | null | undefined,
  endYear: number | null | undefined,
) {
  if (startYear == null && endYear == null) return "";
  if (startYear != null && endYear == null) return `${startYear}–Present`;
  if (startYear == null && endYear != null) return String(endYear);
  return `${startYear}–${endYear}`;
}

export function formatEducationLines(list: EducationFormEntry[]) {
  return list
    .filter((e) => e.school.trim() || e.degree.trim() || e.major.trim())
    .map((e) =>
      [e.degree, e.major, e.school, formatYearRange(e.startYear, e.endYear)]
        .map((x) => String(x ?? "").trim())
        .filter(Boolean)
        .join(" · "),
    )
    .join("\n");
}

export function formatWorkLines(list: WorkFormEntry[]) {
  return list
    .filter((e) => e.company.trim() || e.role.trim() || e.description.trim())
    .map((e) => {
      const place = [e.city, e.country].filter((x) => x.trim()).join(", ");
      return [e.role, e.company, place, formatYearRange(e.startYear, e.endYear)]
        .map((x) => String(x ?? "").trim())
        .filter(Boolean)
        .join(" · ");
    })
    .join("\n");
}

export function formatYearsExperience(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "";
  const n = Math.trunc(value);
  return n === 1 ? "1 year" : `${n} years`;
}

export function valuesFromProfile(
  profile: CandidateProfileData,
): Record<OnboardingStageField, string> {
  const voice = parseTtsLanguage(profile.voiceLanguage);
  return {
    voiceLanguage: voice ? languageLabel(voice) : "",
    headline: profile.headline.trim(),
    yearsExperience: formatYearsExperience(profile.yearsExperience),
    education: formatEducationLines(profile.education),
    workExperience: formatWorkLines(profile.workExperience),
    languages: profile.languages
      .map((x) => x.trim())
      .filter(Boolean)
      .join(", "),
    summary: profile.summary.trim(),
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function profileFromUnknown(value: unknown): CandidateProfileData | null {
  const rec = asRecord(value);
  if (!rec) return null;
  if (
    rec.headline === undefined &&
    rec.education === undefined &&
    rec.workExperience === undefined &&
    rec.languages === undefined &&
    rec.yearsExperience === undefined &&
    rec.summary === undefined &&
    rec.voiceLanguage === undefined
  ) {
    return null;
  }
  return toCandidateProfileData(
    rec as Parameters<typeof toCandidateProfileData>[0],
  );
}

function missingFromUnknown(value: unknown): OnboardingStageField[] {
  if (!Array.isArray(value)) return [];
  const out: OnboardingStageField[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const key = LABEL_TO_FIELD.get(item.trim().toLowerCase());
    if (key && !out.includes(key)) out.push(key);
  }
  return out;
}

function changedWritingKeys(
  profile: CandidateProfileData,
  input: unknown,
): OnboardingStageField[] {
  const rec = asRecord(input);
  if (!rec) return [];
  const next = applyPatch(profile, input);
  const before = valuesFromProfile(profile);
  const after = valuesFromProfile(next);
  const keys: OnboardingStageField[] = [];
  for (const key of ONBOARDING_STAGE_FIELDS) {
    if (rec[key] === undefined) continue;
    if (before[key] !== after[key]) keys.push(key);
  }
  return keys;
}

function applyPatch(
  profile: CandidateProfileData,
  input: unknown,
): CandidateProfileData {
  const rec = asRecord(input);
  if (!rec) return profile;
  return toCandidateProfileData({
    ...profile,
    ...rec,
    yearsExperience:
      typeof rec.yearsExperience === "number"
        ? rec.yearsExperience
        : rec.yearsExperience === null
          ? null
          : profile.yearsExperience,
    voiceLanguage:
      typeof rec.voiceLanguage === "string"
        ? rec.voiceLanguage
        : profile.voiceLanguage,
  } as never);
}

function lastAssistantText(messages: UIMessage[]) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message?.role !== "assistant") continue;
    const text = uiMessageText(message);
    if (text) return text;
  }
  return "";
}

export function inferAskingField(
  text: string,
  missing: OnboardingStageField[],
): OnboardingStageField | null {
  const trimmed = text.trim();
  if (trimmed) {
    for (const hint of ASK_HINTS) {
      if (hint.pattern.test(trimmed)) return hint.key;
    }
  }
  return missing[0] ?? null;
}

export function readOnboardingStage(
  messages: UIMessage[],
): OnboardingStageSnapshot {
  let profile = emptyCandidateProfileData();
  let missing: OnboardingStageField[] = [];
  const writing: OnboardingStageField[] = [];

  for (const message of messages) {
    for (const part of message.parts) {
      if (!isToolUIPart(part)) continue;

      if (part.type === LANG_TOOL && part.state === "output-available") {
        const rec = asRecord(part.output);
        const code =
          typeof rec?.language_code === "string" ? rec.language_code : "";
        const parsed = parseTtsLanguage(code);
        if (parsed) {
          profile = { ...profile, voiceLanguage: parsed };
        }
      }

      if (part.type === GET_TOOL && part.state === "output-available") {
        const rec = asRecord(part.output);
        const next = profileFromUnknown(rec?.profile);
        if (next) profile = next;
        missing = missingFromUnknown(rec?.missing);
      }

      if (part.type === UPDATE_TOOL) {
        if (
          part.state === "input-streaming" ||
          part.state === "input-available"
        ) {
          const keys = changedWritingKeys(profile, part.input);
          writing.length = 0;
          writing.push(...keys);
          profile = applyPatch(profile, part.input);
        }
        if (part.state === "output-available") {
          const rec = asRecord(part.output);
          const next = profileFromUnknown(rec?.profile);
          if (next) profile = next;
          missing = missingFromUnknown(rec?.missing);
          writing.length = 0;
        }
      }

      if (part.type === FINISH_TOOL && part.state === "output-available") {
        const rec = asRecord(part.output);
        const next = profileFromUnknown(rec?.profile);
        if (next) profile = next;
        missing = [];
        writing.length = 0;
      }
    }
  }

  return {
    values: valuesFromProfile(profile),
    asking: inferAskingField(lastAssistantText(messages), missing),
    writing: [...writing],
    missing,
  };
}
