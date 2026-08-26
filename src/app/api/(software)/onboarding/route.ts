import {
  createAgentUIStreamResponse,
  generateText,
  isStepCount,
  ToolLoopAgent,
  tool,
} from "ai";
import { after } from "next/server";
import { z } from "zod";
import {
  getAiRuntime,
  llmModel,
  llmTemp,
  renderOnboardingPrompt,
  renderProfileSummaryPrompt,
} from "@/lib/ai/runtime";
import { parseTtsLanguage, TTS_LANGUAGE_CODES } from "@/lib/ai/voice/languages";
import { requireProfile } from "@/lib/auth/session";
import {
  CANDIDATE_FIELD_LABELS,
  type CandidateProfileData,
  type CandidateProfileFields,
  type CandidateProfileUpdateInput,
  candidateProfileUpdateSchema,
  candidateUpdateToMongo,
  getMissingCandidateFields,
  getMissingInterviewFields,
  isCandidateProfileComplete,
  isInterviewFieldsComplete,
  mergeCandidateProfilePatch,
  toCandidateProfileData,
} from "@/lib/candidate/profile";
import { parseDateOnly } from "@/lib/core/dates";
import { lookupPlaceOptions } from "@/lib/core/geo/places";
import { rateLimitPerMinute, tooManyRequests } from "@/lib/core/rate-limit";
import client, { COLLECTIONS, DB_NAME, matchId } from "@/lib/db";
import { isIdentityVerified } from "@/lib/kyc";
import { lastUserText, screenWorkerTurnSafe } from "@/lib/legal-safety/detect";
import { prohibitedOutputGuard } from "@/lib/legal-safety/guard-stream";
import { hasProhibitedOutput } from "@/lib/legal-safety/lexicon";

export const maxDuration = 90;

const GEO_PLACE_PROMPT = `Places (must use country-state-city official English names):
- Do not interview location, residence, or identity — DigiLocker already filled those at sign-in.
- Do interview currently working as (save as headline) and years of experience (JSON number, including 0).
- If you save preferredCountries from a resume, they must match the geo library — never invent names or use nicknames (e.g. use "United Arab Emirates" not "UAE"; "United States" not "USA").
- Before saving preferredCountries, call listPlaceOptions to look up valid names.
- Numeric fields (yearsExperience, startYear, endYear, gpa) must be JSON numbers, never strings. Use null for unknown or ongoing endYear (Present).`;

type UserDoc = CandidateProfileFields & {
  _id: unknown;
  name?: string;
  email?: string;
  image?: string;
};

type UiFilePart = {
  type?: string;
  mediaType?: string;
  url?: string;
};

type UiMessage = {
  role?: string;
  parts?: UiFilePart[];
};

async function loadProfile(userId: string) {
  const db = client.db(DB_NAME);
  const doc = await db
    .collection<UserDoc>(COLLECTIONS.USERS_COLLECTION)
    .findOne({ _id: matchId(userId) as never });
  return toCandidateProfileData(doc);
}

async function saveProfile(
  userId: string,
  patch: Partial<CandidateProfileUpdateInput>,
) {
  const db = client.db(DB_NAME);
  const filter = { _id: matchId(userId) as never };
  const existing = await db
    .collection<UserDoc>(COLLECTIONS.USERS_COLLECTION)
    .findOne(filter);
  const current = toCandidateProfileData(existing);
  // DigiLocker-verified identity fields cannot be changed via onboarding.
  const safePatch = isIdentityVerified(existing)
    ? Object.fromEntries(
        Object.entries(patch).filter(
          ([key]) =>
            ![
              "phoneNumber",
              "phoneCountryCode",
              "dateOfBirth",
              "location",
              "residenceCountry",
              "residenceState",
              "residenceCity",
              "residencePostalCode",
            ].includes(key),
        ),
      )
    : patch;

  const mergedInput = mergeCandidateProfilePatch(
    current,
    safePatch as Partial<CandidateProfileUpdateInput>,
  );

  const preview = toCandidateProfileData({
    ...existing,
    ...mergedInput,
    yearsExperience: mergedInput.yearsExperience,
    fullTimeCompensation: mergedInput.fullTimeCompensation,
    partTimeCompensation: mergedInput.partTimeCompensation,
    dateOfBirth: parseDateOnly(mergedInput.dateOfBirth),
  });
  const complete = isCandidateProfileComplete(preview);
  const { $set, $unset } = candidateUpdateToMongo(mergedInput, complete);

  await db
    .collection(COLLECTIONS.USERS_COLLECTION)
    .updateOne(
      filter,
      Object.keys($unset).length ? { $set, $unset } : { $set },
    );

  const updated = await loadProfile(userId);
  return {
    profile: updated,
    complete: isCandidateProfileComplete(updated),
    interviewComplete: isInterviewFieldsComplete(updated),
    missing: getMissingInterviewFields(updated).map(
      (k) => CANDIDATE_FIELD_LABELS[k],
    ),
  };
}

async function generateAndSaveSummary(userId: string) {
  const profile = await loadProfile(userId);
  const summary = await writeProfessionalSummary(profile);
  return saveProfile(userId, { summary });
}

async function writeProfessionalSummary(
  profile: CandidateProfileData,
): Promise<string> {
  const edu = profile.education
    .filter((e) => e.school.trim() || e.degree.trim() || e.major.trim())
    .map((e) =>
      [e.degree, e.major, e.school, e.startYear, e.endYear]
        .filter((x) => x !== null && x !== "")
        .join(" · "),
    )
    .join("\n");
  const work = profile.workExperience
    .filter((e) => e.company.trim() || e.role.trim() || e.description.trim())
    .map((e) =>
      [
        e.role,
        e.company,
        e.city,
        e.country,
        e.startYear,
        e.endYear,
        e.description,
      ]
        .filter((x) => x !== null && x !== "")
        .join(" · "),
    )
    .join("\n");

  const settings = await getAiRuntime();
  const facts = `Name: ${profile.name || "Candidate"}
Headline: ${profile.headline || "—"}
Location: ${profile.location || "—"}
Years of experience: ${profile.yearsExperience ?? "—"}
Languages: ${profile.languages.join(", ") || "—"}
Skills (from resume only, may be empty): ${profile.skills.join(", ") || "—"}
Education:
${edu || "—"}
Work experience:
${work || "—"}`;

  const { text } = await generateText({
    model: llmModel(settings),
    temperature: llmTemp(settings, "profileSummary"),
    prompt: renderProfileSummaryPrompt(settings, facts),
  });

  const cleaned = text.trim();
  if (cleaned.length >= 40 && !hasProhibitedOutput(cleaned)) return cleaned;
  // Fallback if the model returns something too short, or a summary that makes
  // a determination it is not allowed to make.
  const bits = [
    profile.headline,
    profile.yearsExperience != null
      ? `${profile.yearsExperience} years of experience`
      : "",
    profile.location ? `based in ${profile.location}` : "",
  ].filter(Boolean);
  return `${bits.join(", ") || "Experienced professional"}. ${
    work ? `Background includes ${work.slice(0, 280)}.` : ""
  } ${edu ? `Education: ${edu.slice(0, 160)}.` : ""}`.trim();
}

function dataUrlToBytes(dataUrl: string): Uint8Array | null {
  const match = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/i.exec(dataUrl);
  if (!match) return null;
  const isBase64 = Boolean(match[2]);
  const data = match[3] ?? "";
  try {
    if (isBase64) {
      const binary = atob(data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes;
    }
    return new TextEncoder().encode(decodeURIComponent(data));
  } catch {
    return null;
  }
}

/** Pull the latest attached PDF from UI messages (data URL only — never blob-hosted). */
function extractLatestPdfBytes(messages: unknown[]): Uint8Array | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i] as UiMessage;
    if (msg?.role !== "user" || !Array.isArray(msg.parts)) continue;
    for (let j = msg.parts.length - 1; j >= 0; j--) {
      const part = msg.parts[j];
      if (
        part?.type === "file" &&
        part.mediaType === "application/pdf" &&
        typeof part.url === "string" &&
        part.url.startsWith("data:")
      ) {
        return dataUrlToBytes(part.url);
      }
    }
  }
  return null;
}

/** Drop file parts so the model does not re-ingest the large PDF after we already parsed it. */
function stripFileParts(messages: unknown[]): unknown[] {
  return messages.map((raw) => {
    const msg = raw as UiMessage & Record<string, unknown>;
    if (!Array.isArray(msg.parts)) return raw;
    return {
      ...msg,
      parts: msg.parts.filter((p) => p?.type !== "file"),
    };
  });
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(String)
    .map((s) => s.trim())
    .filter(Boolean);
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asNullableInt(value: unknown): number | null {
  const n = asNullableNumber(value);
  return n === null ? null : Math.trunc(n);
}

function asEducationList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 15).map((raw) => {
    const e = (raw ?? {}) as Record<string, unknown>;
    return {
      school: String(e.school ?? ""),
      degree: String(e.degree ?? ""),
      startYear: asNullableInt(e.startYear),
      endYear: asNullableInt(e.endYear),
      major: String(e.major ?? ""),
      gpa: asNullableNumber(e.gpa),
    };
  });
}

function asWorkList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).map((raw) => {
    const e = (raw ?? {}) as Record<string, unknown>;
    return {
      company: String(e.company ?? ""),
      role: String(e.role ?? ""),
      startYear: asNullableInt(e.startYear),
      endYear: asNullableInt(e.endYear),
      city: String(e.city ?? ""),
      country: String(e.country ?? ""),
      description: String(e.description ?? ""),
    };
  });
}

async function applyResumeFromPdfBytes(userId: string, pdfBytes: Uint8Array) {
  const settings = await getAiRuntime();
  const { text } = await generateText({
    model: llmModel(settings),
    temperature: llmTemp(settings, "resumeParse"),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: settings.prompts.resumeParse,
          },
          {
            type: "file",
            data: pdfBytes,
            mediaType: "application/pdf",
          },
        ],
      },
    ],
  });

  let extracted: Record<string, unknown> = {};
  try {
    const match = text.match(/\{[\s\S]*\}/);
    extracted = match ? JSON.parse(match[0]) : {};
  } catch {
    return {
      ok: false as const,
      error: "Could not parse resume. Ask the candidate key fields by voice.",
    };
  }

  const education = asEducationList(extracted.education);
  const workExperience = asWorkList(extracted.workExperience);
  const languages = asStringList(extracted.languages);
  const hobbies = asStringList(extracted.hobbies);
  const otherLinks = asStringList(extracted.otherLinks);
  const preferredCountries = asStringList(extracted.preferredCountries);
  const skills = asStringList(extracted.skills);
  const isECR =
    typeof extracted.isECR === "boolean" ? extracted.isECR : undefined;

  const result = await saveProfile(userId, {
    headline: String(extracted.headline ?? ""),
    yearsExperience: asNullableInt(extracted.yearsExperience),
    // Skills only from resume PDF — never from voice interview.
    ...(skills.length ? { skills } : {}),
    preferredCountries,
    // Identity (phone, location, DOB, name) comes from DigiLocker at sign-in — not the PDF.
    // Summary is AI-generated at the end of onboarding — do not take from PDF.
    ...(education.length ? { education } : {}),
    ...(typeof isECR === "boolean" ? { isECR } : {}),
    ...(workExperience.length ? { workExperience } : {}),
    ...(languages.length ? { languages } : {}),
    ...(hobbies.length ? { hobbies } : {}),
    ...(otherLinks.length ? { otherLinks } : {}),
    portfolioUrl: String(extracted.portfolioUrl ?? ""),
    fullTimeCompensation: asNullableNumber(extracted.fullTimeCompensation),
    partTimeCompensation: asNullableNumber(extracted.partTimeCompensation),
  });

  // If interview fields are already full after resume, generate summary now.
  if (result.interviewComplete && !isCandidateProfileComplete(result.profile)) {
    return {
      ok: true as const,
      ...(await generateAndSaveSummary(userId)),
    };
  }

  return { ok: true as const, ...result };
}

async function buildAgent(
  userId: string,
  userName: string,
  opts: {
    resumeApplied?: { complete: boolean; missing: string[] } | null;
    resumeParseFailed?: boolean;
    languageCode?: string | null;
    /** Live interview gaps (never includes skills or summary). */
    missingLabels: string[];
    alreadyComplete: boolean;
  },
) {
  const resumeApplied = opts.resumeApplied;
  const missingLine = opts.missingLabels.length
    ? `Currently missing interview fields: ${opts.missingLabels.join(", ")}.`
    : "No interview fields missing — call finishOnboarding (it will write the professional summary).";

  const resumeContext = opts.alreadyComplete
    ? `IMPORTANT — the profile is already complete.
Congratulate ${userName || "the candidate"} briefly and call finishOnboarding immediately. Do not ask more questions.`
    : resumeApplied
      ? `IMPORTANT — resume already processed this turn:
The candidate attached a resume PDF. It was parsed and saved (skills come from the PDF only).
${missingLine}
Speak in their selected voice language. Ask only for those missing interview fields, one at a time. Never re-ask fields already filled.
NEVER ask about skills or professional summary.
If nothing is missing, congratulate them in that language and call finishOnboarding (summary is auto-written there).`
      : opts.resumeParseFailed
        ? `IMPORTANT — the candidate attached a resume PDF but automatic extraction failed.
${missingLine}
Tell them briefly in their selected voice language, then interview only the missing interview fields one at a time. Use updateCandidateProfile after each useful answer.
NEVER ask about skills or professional summary.`
        : `Profile state: ${missingLine}

Flow:
1. ${
            opts.languageCode
              ? `Voice language is already set (${opts.languageCode}). Do NOT call selectVoiceLanguage. Greet ${userName || "the candidate"} briefly in that language.`
              : `If voice language is not set yet, say one short spoken sentence asking them to pick a language, then call selectVoiceLanguage (interactive picker in chat). Do not ask onboarding questions before they pick. After they pick, the language is saved to their profile. Then greet ${userName || "the candidate"} briefly in that language.`
          }
2. Immediately call getCandidateProfile (do this every session after language is set). Ask ONLY for fields listed in missing — currently working as (headline), years of experience, education, work experience, and languages. Never re-ask filled ones. Never ask identity fields (name, email, phone, location, gender, PAN, DOB, Aadhaar). After they answer education, call updateCandidateProfile in that turn with education[] and isECR.
3. If this is a brand-new empty profile (many fields missing) and they have not been offered a resume yet this session: say one short spoken sentence in their voice language asking if they have a resume PDF, then call selectResume. Wait for the picker. Skip the resume picker if most interview fields are already filled.
4. If has_resume is true: PDF is parsed automatically (education, work, languages, and skills may come from PDF). Ask only remaining interview fields.
5. If has_resume is false (or resume skipped): interview only missing interview fields, one at a time. Use updateCandidateProfile after each useful answer.
6. As soon as missing is empty, congratulate them and call finishOnboarding — do NOT ask them to dictate a summary; finishOnboarding writes it.
${
  opts.languageCode
    ? "Do not call selectVoiceLanguage — language is already on the profile."
    : "Call selectVoiceLanguage at most once per session (only if voice language is not already on the profile)."
}
Call selectResume at most once per session.`;

  const settings = await getAiRuntime();
  return new ToolLoopAgent({
    id: "candidate-onboarding",
    model: llmModel(settings),
    temperature: llmTemp(settings, "onboarding"),
    instructions: renderOnboardingPrompt(settings, {
      languageCode: opts.languageCode,
      geoPlacePrompt: GEO_PLACE_PROMPT,
      resumeContext,
    }),
    stopWhen: isStepCount(24),
    tools: {
      selectVoiceLanguage: tool({
        description:
          "Show the spoken-language picker in chat. Speak a short question first, then call this and wait for their selection. Call FIRST before other onboarding questions.",
        inputSchema: z.object({
          prompt: z
            .string()
            .max(200)
            .optional()
            .describe("Short question above the language buttons"),
        }),
      }),
      selectResume: tool({
        description:
          "Show Upload / No resume buttons in chat. Speak a short question in the candidate's voice language first (also pass it as prompt), then wait for their selection. Call AFTER language is set. Skip if most interview fields are already filled.",
        inputSchema: z.object({
          prompt: z
            .string()
            .max(200)
            .optional()
            .describe("Short question above the resume buttons"),
        }),
      }),
      listPlaceOptions: tool({
        description:
          "Look up valid country / state / city names from the country-state-city library for preferredCountries. Call before saving preferredCountries. Omit country to list countries; pass country to list states (or cities if none); pass country+state to list cities. Optional query filters the list. Do not collect residence or address — DigiLocker already filled location at sign-in.",
        inputSchema: z.object({
          country: z
            .string()
            .max(80)
            .optional()
            .describe("Official country name or ISO code"),
          state: z
            .string()
            .max(80)
            .optional()
            .describe("Official state/province name or code"),
          query: z
            .string()
            .max(80)
            .optional()
            .describe("Optional substring filter for the returned names"),
        }),
        execute: async (input) => lookupPlaceOptions(input),
      }),
      getCandidateProfile: tool({
        description:
          "Read the candidate's current profile and missing interview fields. Call this before asking questions so you only ask what is left.",
        inputSchema: z.object({}),
        execute: async () => {
          const profile = await loadProfile(userId);
          const missing = getMissingInterviewFields(profile);
          return {
            profile,
            complete: isCandidateProfileComplete(profile),
            interviewComplete: isInterviewFieldsComplete(profile),
            missing: missing.map((k) => CANDIDATE_FIELD_LABELS[k]),
          };
        },
      }),
      updateCandidateProfile: tool({
        description:
          "Partially update candidate profile fields from the voice interview. Always pass field values in clear English. headline = currently working as (current role / job title). yearsExperience = total years as a JSON number (0 is ok). When they answer education, save education[] and isECR (boolean) in that same call: isECR false for class 10 / 12 / diploma / ITI / degree / postgraduate; isECR true for no schooling or below class 10. Do not set skills or summary here.",
        inputSchema: candidateProfileUpdateSchema.partial().extend({
          preferredCountries: z.array(z.string()).optional(),
          languages: z.array(z.string()).optional(),
          voiceLanguage: z.enum(TTS_LANGUAGE_CODES).optional(),
          hobbies: z.array(z.string()).optional(),
          otherLinks: z.array(z.string()).optional(),
          isECR: z
            .boolean()
            .optional()
            .describe(
              "false = Non-ECR (class 10 / 12 / diploma / degree / postgraduate). true = ECR (no schooling or below class 10). Set in the same call as education.",
            ),
        }),
        execute: async (input) => {
          const rest = { ...input } as Partial<CandidateProfileUpdateInput>;
          // Voice interview must never set identity or auto-generated fields.
          delete rest.phoneNumber;
          delete rest.phoneCountryCode;
          delete rest.skills;
          delete rest.summary;
          delete rest.dateOfBirth;
          delete rest.location;
          delete rest.residenceCountry;
          delete rest.residenceState;
          delete rest.residenceCity;
          delete rest.residencePostalCode;
          let result = await saveProfile(userId, rest);
          if (result.interviewComplete && !result.complete) {
            result = await generateAndSaveSummary(userId);
          }
          if (result.complete) {
            return {
              ...result,
              finished: true,
              redirectTo: "/candidate/kyc",
            };
          }
          return result;
        },
      }),
      finishOnboarding: tool({
        description:
          "Finish onboarding when interview fields are done. Generates the professional summary automatically, then marks complete. Never ask the user for a summary.",
        inputSchema: z.object({}),
        execute: async () => {
          let profile = await loadProfile(userId);
          const interviewGaps = getMissingInterviewFields(profile);
          if (interviewGaps.length) {
            return {
              ok: false,
              finished: false,
              missing: interviewGaps.map((k) => CANDIDATE_FIELD_LABELS[k]),
            };
          }
          if (!isCandidateProfileComplete(profile)) {
            await generateAndSaveSummary(userId);
            profile = await loadProfile(userId);
          }
          if (!isCandidateProfileComplete(profile)) {
            return {
              ok: false,
              finished: false,
              missing: getMissingCandidateFields(profile).map(
                (k) => CANDIDATE_FIELD_LABELS[k],
              ),
            };
          }
          const result = await saveProfile(userId, {});
          return {
            ok: true,
            finished: true,
            redirectTo: "/candidate/kyc",
            ...result,
          };
        },
      }),
    },
  });
}

export async function POST(request: Request) {
  const authResult = await requireProfile("work");
  if (!authResult.ok) {
    return new Response(authResult.error, { status: authResult.status });
  }
  const limit = await rateLimitPerMinute("onboardingChat", authResult.user.id);
  if (!limit.ok) return tooManyRequests(limit);
  const user = {
    id: authResult.user.id,
    name: authResult.user.name ?? undefined,
    profileType: authResult.user.profileType,
  };

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const messages = (body as { messages?: unknown; language_code?: unknown })
    .messages;
  if (!Array.isArray(messages)) {
    return new Response("Expected { messages: unknown[] }", { status: 400 });
  }

  const languageFromBody = parseTtsLanguage(
    typeof (body as { language_code?: unknown }).language_code === "string"
      ? (body as { language_code: string }).language_code
      : null,
  );

  let resumeApplied: { complete: boolean; missing: string[] } | null = null;
  let resumeParseFailed = false;
  const pdfBytes = extractLatestPdfBytes(messages);
  if (pdfBytes?.length) {
    const applied = await applyResumeFromPdfBytes(user.id, pdfBytes);
    if (applied.ok) {
      resumeApplied = {
        complete: applied.complete,
        missing: applied.missing,
      };
    } else {
      resumeParseFailed = true;
    }
  }

  const uiMessages =
    resumeApplied || resumeParseFailed ? stripFileParts(messages) : messages;

  // Seed live interview gaps (skills/summary are never asked).
  const currentProfile = await loadProfile(user.id);
  const languageCode =
    parseTtsLanguage(currentProfile.voiceLanguage) || languageFromBody;
  const missingLabels = getMissingInterviewFields(currentProfile).map(
    (k) => CANDIDATE_FIELD_LABELS[k],
  );
  const alreadyComplete =
    resumeApplied?.complete === true ||
    isCandidateProfileComplete(currentProfile);

  const agent = await buildAgent(user.id, user.name ?? "", {
    resumeApplied,
    resumeParseFailed,
    languageCode,
    missingLabels: resumeApplied?.missing ?? missingLabels,
    alreadyComplete,
  });
  after(async () => {
    await screenWorkerTurnSafe({
      userId: user.id,
      profileType: "work",
      text: lastUserText(uiMessages),
      sourceKind: "chat",
      sourceId: `onboarding:${user.id}`,
    });
  });
  return createAgentUIStreamResponse({
    agent,
    uiMessages,
    experimental_transform: prohibitedOutputGuard({ surface: "onboarding" }),
  });
}
