import {
  createAgentUIStreamResponse,
  stepCountIs,
  ToolLoopAgent,
  tool,
  generateText,
} from "ai";
import { headers } from "next/headers";
import { z } from "zod";
import client, { DB_NAME, COLLECTIONS, matchId } from "@/lib/db";
import {
  CANDIDATE_FIELD_LABELS,
  candidateProfileUpdateSchema,
  candidateUpdateToMongo,
  getMissingCandidateFields,
  isCandidateProfileComplete,
  mergeCandidateProfilePatch,
  toCandidateProfileData,
  type CandidateProfileFields,
  type CandidateProfileUpdateInput,
} from "@/lib/candidate/profile";
import { auth } from "@/lib/auth/auth";
import { VOICE_DELIVERY_PROMPT } from "@/lib/voice/style";

export const maxDuration = 90;

const gatewayModel = process.env.AI_GATEWAY_MODEL?.trim() || "openai/gpt-4o";

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
  const existing = await db.collection<UserDoc>(COLLECTIONS.USERS_COLLECTION).findOne(filter);
  const current = toCandidateProfileData(existing);
  const mergedInput = mergeCandidateProfilePatch(current, patch);

  const preview = toCandidateProfileData({
    ...existing,
    ...mergedInput,
    yearsExperience:
      mergedInput.yearsExperience === ""
        ? undefined
        : Number(mergedInput.yearsExperience),
    resumeSource: mergedInput.resumeSource || undefined,
  });
  const complete = isCandidateProfileComplete(preview);
  const { $set, $unset } = candidateUpdateToMongo(mergedInput, complete);

  await db.collection(COLLECTIONS.USERS_COLLECTION).updateOne(
    filter,
    Object.keys($unset).length ? { $set, $unset } : { $set },
  );

  const updated = await loadProfile(userId);
  return {
    profile: updated,
    complete: isCandidateProfileComplete(updated),
    missing: getMissingCandidateFields(updated).map(
      (k) => CANDIDATE_FIELD_LABELS[k],
    ),
  };
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
  return value.map(String).map((s) => s.trim()).filter(Boolean);
}

function asEducationList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 15).map((raw) => {
    const e = (raw ?? {}) as Record<string, unknown>;
    return {
      school: String(e.school ?? ""),
      degree: String(e.degree ?? ""),
      startYear: String(e.startYear ?? ""),
      endYear: String(e.endYear ?? ""),
      major: String(e.major ?? ""),
      gpa: String(e.gpa ?? ""),
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
      startYear: String(e.startYear ?? ""),
      endYear: String(e.endYear ?? ""),
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
phoneNumber, headline, location, yearsExperience (number), skills (string[]), workAuthorization, preferredCountries (string[]), summary (2-4 paragraphs),
education (array of {school, degree, startYear, endYear, major, gpa}),
workExperience (array of {company, role, startYear, endYear, city, country, description}),
languages (string[]), hobbies (string[]), portfolioUrl, otherLinks (string[]),
residenceCountry, residenceState, residenceCity, residencePostalCode, dateOfBirth,
fullTimeCompensation, partTimeCompensation.
Use empty string, [] when unknown. endYear may be "Present".`,
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
    phoneNumber: String(extracted.phoneNumber ?? ""),
    headline: String(extracted.headline ?? ""),
    location: String(extracted.location ?? ""),
    yearsExperience: String(extracted.yearsExperience ?? ""),
    skills,
    workAuthorization: String(extracted.workAuthorization ?? ""),
    preferredCountries,
    summary: String(extracted.summary ?? ""),
    resumeUrl: "",
    resumeSource: "upload",
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
    dateOfBirth: String(extracted.dateOfBirth ?? ""),
    fullTimeCompensation: String(extracted.fullTimeCompensation ?? ""),
    partTimeCompensation: String(extracted.partTimeCompensation ?? ""),
  });

  return { ok: true as const, ...result };
}

function buildAgent(
  userId: string,
  userName: string,
  opts?: {
    resumeApplied?: { complete: boolean; missing: string[] } | null;
    resumeParseFailed?: boolean;
  },
) {
  const resumeApplied = opts?.resumeApplied;
  const resumeContext = resumeApplied
    ? `IMPORTANT — resume already processed this turn:
The candidate attached a resume PDF. It was parsed and saved (nothing was stored in blob/file storage).
Call getCandidateProfile immediately. Ask only for missing mandatory fields${
        resumeApplied.missing.length
          ? ` (currently missing: ${resumeApplied.missing.join(", ")})`
          : ""
      }, one at a time.
If complete is true, congratulate them and call finishOnboarding.`
    : opts?.resumeParseFailed
      ? `IMPORTANT — the candidate attached a resume PDF but automatic extraction failed.
Tell them briefly, then interview by voice for the mandatory fields one at a time. Use updateCandidateProfile after each useful answer.`
      : `Flow:
1. Greet ${userName || "the candidate"} briefly. Ask if they already have a resume PDF.
2. If YES: tell them to use the PDF button on screen. When they attach a PDF, it is parsed automatically — then call getCandidateProfile and ask only for missing fields.
3. If NO: interview them by voice to build a resume summary. Ask one question at a time. Use updateCandidateProfile after each useful answer.
4. When complete is true, congratulate them and say they will go to the dashboard. Call finishOnboarding.`;

  return new ToolLoopAgent({
    id: "candidate-onboarding",
    model: gatewayModel,
    instructions: `You are BlueCollarz's onboarding voice coach for candidates (workers).
Speak in short, clear spoken English (1–3 sentences). The user answers by voice.
${VOICE_DELIVERY_PROMPT}
${resumeContext}

Mandatory fields: phone number, headline/role, location, years of experience, skills, work authorization, professional summary, education (at least one entry), work experience (at least one entry), and languages.
Never invent facts. Prefer updateCandidateProfile for structured saves. Do not ask for or use resume URLs — PDFs are read in-memory only.`,
    stopWhen: stepCountIs(12),
    tools: {
      getCandidateProfile: tool({
        description: "Read the candidate's current profile and missing fields.",
        inputSchema: z.object({}),
        execute: async () => {
          const profile = await loadProfile(userId);
          const missing = getMissingCandidateFields(profile);
          return {
            profile,
            complete: isCandidateProfileComplete(profile),
            missing: missing.map((k) => CANDIDATE_FIELD_LABELS[k]),
          };
        },
      }),
      updateCandidateProfile: tool({
        description:
          "Partially update candidate profile fields collected from conversation.",
        inputSchema: candidateProfileUpdateSchema.partial().extend({
          resumeSource: z.enum(["", "upload", "voice"]).optional(),
          skills: z.array(z.string()).optional(),
          preferredCountries: z.array(z.string()).optional(),
          languages: z.array(z.string()).optional(),
          hobbies: z.array(z.string()).optional(),
          otherLinks: z.array(z.string()).optional(),
        }),
        execute: async (input) => saveProfile(userId, input),
      }),
      finishOnboarding: tool({
        description:
          "Mark onboarding complete when all mandatory fields are filled.",
        inputSchema: z.object({}),
        execute: async () => {
          const profile = await loadProfile(userId);
          if (!isCandidateProfileComplete(profile)) {
            return {
              ok: false,
              missing: getMissingCandidateFields(profile).map(
                (k) => CANDIDATE_FIELD_LABELS[k],
              ),
            };
          }
          const result = await saveProfile(userId, {
            resumeUrl: "",
            resumeSource: profile.resumeSource || "voice",
          });
          return { ok: true, redirectTo: "/candidate/home", ...result };
        },
      }),
    },
  });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as
    | { id?: string; name?: string; profileType?: string }
    | undefined;
  if (!user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (user.profileType && user.profileType !== "work") {
    return new Response("Candidate profile required", { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const messages = (body as { messages?: unknown }).messages;
  if (!Array.isArray(messages)) {
    return new Response("Expected { messages: unknown[] }", { status: 400 });
  }

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
  const agent = buildAgent(user.id, user.name ?? "", {
    resumeApplied,
    resumeParseFailed,
  });
  return createAgentUIStreamResponse({
    agent,
    uiMessages,
  });
}
