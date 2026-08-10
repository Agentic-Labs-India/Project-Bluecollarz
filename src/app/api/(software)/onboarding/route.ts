import {
  createAgentUIStreamResponse,
  isStepCount,
  ToolLoopAgent,
  tool,
  generateText,
} from "ai";
import { z } from "zod";
import client, { DB_NAME, COLLECTIONS, matchId } from "@/lib/db";
import {
  CANDIDATE_FIELD_LABELS,
  candidateProfileUpdateSchema,
  candidateUpdateToMongo,
  getMissingCandidateFields,
  getMissingInterviewFields,
  isCandidateProfileComplete,
  isInterviewFieldsComplete,
  mergeCandidateProfilePatch,
  toCandidateProfileData,
  type CandidateProfileData,
  type CandidateProfileFields,
  type CandidateProfileUpdateInput,
} from "@/lib/candidate/profile";
import { getGatewayModel } from "@/lib/ai/gateway-model";
import { requireProfile } from "@/lib/api/session";
import {
  voiceLanguagePrompt,
  VOICE_TOOL_DATA_PROMPT,
  TTS_LANGUAGE_CODES,
} from "@/lib/voice/languages";
import { VOICE_DELIVERY_PROMPT } from "@/lib/voice/style";
import { lookupPlaceOptions } from "@/lib/geo/places";
import { parseDateOnly } from "@/lib/dates";
import { isIdentityVerified } from "@/lib/kyc";

export const maxDuration = 90;

const GEO_PLACE_PROMPT = `Places (must use country-state-city official English names):
- residenceCountry, residenceState, residenceCity, and preferredCountries must match the geo library — never invent names or use nicknames (e.g. use "United Arab Emirates" not "UAE"; "United States" not "USA").
- Before saving those fields, call listPlaceOptions to look up valid names.
- preferredCountries: array of official country names only.
- Residence flow: country → state (if listed) → city. Each value must appear in listPlaceOptions.
- Postal code can be free text; place names cannot.
- Numeric fields (yearsExperience, startYear, endYear, gpa, fullTimeCompensation, partTimeCompensation) must be JSON numbers, never strings. Use null for unknown or ongoing endYear (Present).`;

const gatewayModel = getGatewayModel();

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

  const { text } = await generateText({
    model: gatewayModel,
    prompt: `Write a professional candidate summary for a job platform profile.
Use ONLY the facts below. Do not invent employers, degrees, skills, or years.
Tone: clear, confident, third-person or first-person is fine; 2–4 short paragraphs; plain text; no markdown bullets.
If skills are empty, do not invent a skills list — focus on role, experience, education, and languages.

Name: ${profile.name || "Candidate"}
Headline: ${profile.headline || "—"}
Location: ${profile.location || "—"}
Years of experience: ${profile.yearsExperience ?? "—"}
Languages: ${profile.languages.join(", ") || "—"}
Skills (from resume only, may be empty): ${profile.skills.join(", ") || "—"}
Education:
${edu || "—"}
Work experience:
${work || "—"}

Return ONLY the summary text.`,
  });

  const cleaned = text.trim();
  if (cleaned.length >= 40) return cleaned;
  // Fallback if the model returns something too short.
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
  const { text } = await generateText({
    model: gatewayModel,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Extract candidate profile JSON from this resume PDF. Return ONLY valid JSON with keys:
phoneNumber (number|null — national digits only), phoneCountryCode (number|null — calling code, e.g. 91), headline, location, yearsExperience (number|null), skills (string[]), preferredCountries (string[]), summary (2-4 paragraphs),
education (array of {school, degree, startYear (number|null), endYear (number|null), major, gpa (number|null)}),
workExperience (array of {company, role, startYear (number|null), endYear (number|null), city, country, description}),
languages (string[]), hobbies (string[]), portfolioUrl, otherLinks (string[]),
residenceCountry, residenceState, residenceCity, residencePostalCode,
fullTimeCompensation (number|null USD/year), partTimeCompensation (number|null USD/hour).
Use "" / [] / null when unknown. endYear null means Present/ongoing. All numeric fields must be JSON numbers, never strings.
For preferredCountries, residenceCountry, residenceState, and residenceCity: use official English geographic names only (e.g. "India", "Karnataka", "Bengaluru", "United Arab Emirates"). Do not use abbreviations like UAE/USA/UK.`,
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

  const result = await saveProfile(userId, {
    // Only write phone when the resume actually has one — never wipe existing.
    ...(typeof extracted.phoneNumber === "number"
      ? { phoneNumber: extracted.phoneNumber }
      : {}),
    ...(typeof extracted.phoneCountryCode === "number"
      ? { phoneCountryCode: extracted.phoneCountryCode }
      : {}),
    headline: String(extracted.headline ?? ""),
    location: String(extracted.location ?? ""),
    yearsExperience: asNullableInt(extracted.yearsExperience),
    // Skills only from resume PDF — never from voice interview.
    ...(skills.length ? { skills } : {}),
    preferredCountries,
    // Summary is AI-generated at the end of onboarding — do not take from PDF.
    ...(education.length ? { education } : {}),
    ...(workExperience.length ? { workExperience } : {}),
    ...(languages.length ? { languages } : {}),
    ...(hobbies.length ? { hobbies } : {}),
    ...(otherLinks.length ? { otherLinks } : {}),
    portfolioUrl: String(extracted.portfolioUrl ?? ""),
    residenceCountry: String(extracted.residenceCountry ?? ""),
    residenceState: String(extracted.residenceState ?? ""),
    residenceCity: String(extracted.residenceCity ?? ""),
    residencePostalCode: String(extracted.residencePostalCode ?? ""),
    fullTimeCompensation: asNullableNumber(extracted.fullTimeCompensation),
    partTimeCompensation: asNullableNumber(extracted.partTimeCompensation),
  });

  // If interview fields are already full after resume, generate summary now.
  if (
    result.interviewComplete &&
    !isCandidateProfileComplete(result.profile)
  ) {
    return {
      ok: true as const,
      ...(await generateAndSaveSummary(userId)),
    };
  }

  return { ok: true as const, ...result };
}

function buildAgent(
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
Ask only for those missing interview fields, one at a time. Never re-ask fields already filled.
NEVER ask about skills or professional summary.
If nothing is missing, congratulate them and call finishOnboarding (summary is auto-written there).`
      : opts.resumeParseFailed
        ? `IMPORTANT — the candidate attached a resume PDF but automatic extraction failed.
${missingLine}
Tell them briefly, then interview only the missing interview fields one at a time. Use updateCandidateProfile after each useful answer.
NEVER ask about skills or professional summary.`
        : `Profile state: ${missingLine}

Flow:
1. ${
            opts.languageCode
              ? `Voice language is already set (${opts.languageCode}). Do NOT call selectVoiceLanguage. Greet ${userName || "the candidate"} briefly in that language.`
              : `If voice language is not set yet, call selectVoiceLanguage first (interactive picker in chat). Do not ask onboarding questions before they pick. After they pick, the language is saved to their profile. Then greet ${userName || "the candidate"} briefly in that language.`
          }
2. Immediately call getCandidateProfile (do this every session after language is set). Ask ONLY for fields listed in missing — never re-ask filled ones.
3. If this is a brand-new empty profile (many fields missing) and they have not been offered a resume yet this session: say one short spoken sentence asking if they have a resume PDF, then call selectResume. Wait for the picker. Skip the resume picker if most interview fields are already filled.
4. If has_resume is true: PDF is parsed automatically (skills may come from PDF). Ask only remaining interview fields.
5. If has_resume is false (or resume skipped): interview only missing interview fields, one at a time. Use updateCandidateProfile after each useful answer.
6. As soon as missing is empty, congratulate them, say they will go to the dashboard, and call finishOnboarding — do NOT ask them to dictate a summary; finishOnboarding writes it.
${
  opts.languageCode
    ? "Do not call selectVoiceLanguage — language is already on the profile."
    : "Call selectVoiceLanguage at most once per session (only if voice language is not already on the profile)."
}
Call selectResume at most once per session.`;

  return new ToolLoopAgent({
    id: "candidate-onboarding",
    model: gatewayModel,
    instructions: `You are Blucollarz's onboarding voice coach for candidates (workers).
Speak in short, clear spoken sentences (1–3). The user answers by voice.
${voiceLanguagePrompt(opts.languageCode)}
${VOICE_DELIVERY_PROMPT}
${VOICE_TOOL_DATA_PROMPT}
${GEO_PLACE_PROMPT}
${resumeContext}

Interview fields only: headline/role, location, years of experience, education (at least one entry), work experience (at least one entry), and languages.
NEVER ask about skills — skills are filled only when a resume PDF provides them. Do not invent or voice-collect skills.
NEVER ask about professional summary — finishOnboarding generates and saves it automatically.
NEVER ask for phone number, email, Aadhaar, PAN, gender, or date of birth — those come from DigiLocker / profile settings, not this interview.
Never ask about work authorization, visas, work permits, citizenship, or legal eligibility to work in any country.
Never invent facts. Prefer updateCandidateProfile for structured saves. Do not ask for or use resume URLs — PDFs are read in-memory only.
After every updateCandidateProfile, if missing is empty / interviewComplete is true / complete is true, you MUST call finishOnboarding in the same turn.`,
    stopWhen: isStepCount(24),
    tools: {
      selectVoiceLanguage: tool({
        description:
          "Ask the candidate to pick their spoken language for voice sessions. Call this FIRST before greeting. Wait for their selection.",
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
          "Show Upload / No resume buttons in chat. Call AFTER you speak a short question about having a resume PDF. Wait for their selection. Skip if most profile fields are already filled.",
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
          "Look up valid country / state / city names from the country-state-city library. Call before saving residenceCountry, residenceState, residenceCity, or preferredCountries. Omit country to list countries; pass country to list states (or cities if none); pass country+state to list cities. Optional query filters the list.",
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
          "Partially update candidate profile fields from the voice interview. Always pass field values in clear English. Do not set skills or summary here.",
        inputSchema: candidateProfileUpdateSchema.partial().extend({
          preferredCountries: z.array(z.string()).optional(),
          languages: z.array(z.string()).optional(),
          voiceLanguage: z.enum(TTS_LANGUAGE_CODES).optional(),
          hobbies: z.array(z.string()).optional(),
          otherLinks: z.array(z.string()).optional(),
          dateOfBirth: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .nullable()
            .optional()
            .describe("Date of birth as yyyy-MM-dd, or null"),
        }),
        execute: async (input) => {
          const rest = { ...input } as Partial<CandidateProfileUpdateInput>;
          // Voice interview must never set these.
          delete rest.phoneNumber;
          delete rest.phoneCountryCode;
          delete rest.skills;
          delete rest.summary;
          let result = await saveProfile(userId, rest);
          if (result.interviewComplete && !result.complete) {
            result = await generateAndSaveSummary(userId);
          }
          if (result.complete) {
            return {
              ...result,
              finished: true,
              redirectTo: "/candidate/home",
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
            redirectTo: "/candidate/home",
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

  const languageCode =
    typeof (body as { language_code?: unknown }).language_code === "string"
      ? (body as { language_code: string }).language_code
      : null;

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
  const missingLabels = getMissingInterviewFields(currentProfile).map(
    (k) => CANDIDATE_FIELD_LABELS[k],
  );
  const alreadyComplete =
    resumeApplied?.complete === true ||
    isCandidateProfileComplete(currentProfile);

  const agent = buildAgent(user.id, user.name ?? "", {
    resumeApplied,
    resumeParseFailed,
    languageCode,
    missingLabels: resumeApplied?.missing ?? missingLabels,
    alreadyComplete,
  });
  return createAgentUIStreamResponse({
    agent,
    uiMessages,
  });
}
