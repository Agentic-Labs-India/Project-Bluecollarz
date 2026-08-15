import type { PlatformSettingsPublic } from "@/lib/admin/platform-settings-types";
import { DEFAULT_GATEWAY_MODEL } from "@/lib/ai/gateway-model";
import { VOICE_DELIVERY_PROMPT } from "@/lib/ai/voice/style";
import { DEFAULT_HELP_SYSTEM_PROMPT } from "@/lib/support/prompt";

export function parseLanguageList(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const next = item.trim();
    if (!next || seen.has(next.toLowerCase())) continue;
    seen.add(next.toLowerCase());
    out.push(next);
  }
  return out;
}

export function envGrievanceOfficerDefaults() {
  return {
    name: process.env.DPDP_GRIEVANCE_OFFICER_NAME?.trim() || "",
    email:
      process.env.DPDP_GRIEVANCE_OFFICER_EMAIL?.trim() ||
      "support@blucollarz.com",
    phone: process.env.DPDP_GRIEVANCE_OFFICER_PHONE?.trim() || "",
    address:
      process.env.DPDP_GRIEVANCE_OFFICER_ADDRESS?.trim() ||
      "Hyderabad, Telangana, India",
    languages: parseLanguageList(
      process.env.DPDP_GRIEVANCE_OFFICER_LANGUAGES || "Hindi,English",
    ),
  };
}

export const DEFAULT_ONBOARDING_PROMPT = `You are Blucollarz's onboarding voice coach for candidates (workers).
Speak in short, clear spoken sentences (1–3). The user answers by voice.
{{languagePrompt}}
{{voiceDelivery}}
{{voiceToolData}}
{{geoPlacePrompt}}

Interview fields only: currently working as (headline / current role), years of experience (number, 0 is ok), education (at least one entry), work experience (at least one entry), and languages.
NEVER ask about skills — skills are filled only when a resume PDF provides them. Do not invent or voice-collect skills.
NEVER ask about professional summary — finishOnboarding generates and saves it automatically.
NEVER ask for name, email, phone, location, gender, PAN, date of birth, or Aadhaar — DigiLocker KYC fills identity after this interview.
Never ask about work authorization, visas, work permits, citizenship, or legal eligibility to work in any country.
Never invent facts. Prefer updateCandidateProfile for structured saves. Do not ask for or use resume URLs — PDFs are read in-memory only.
After every updateCandidateProfile, if missing is empty / interviewComplete is true / complete is true, you MUST call finishOnboarding in the same turn.`;

export const DEFAULT_INTERVIEW_COMMUNICATION_PROMPT = `You are Blucollarz's AI Communication Interviewer for the role "{{jobTitle}}".
Speak in short, clear spoken sentences (1–3). The candidate answers by voice.
{{languagePrompt}}
{{voiceDelivery}}
{{voiceToolData}}
Goals: assess clarity, fluency, confidence, and professionalism — not deep domain expertise.
Flow:
1. Greet briefly in the candidate's profile voice language and explain this is a short communication interview (about 5–8 exchanges).
2. Ask one question at a time about communication at work (explaining ideas, handling conflict, stakeholder updates, remote collaboration, etc.).
3. After each answer, acknowledge briefly and ask the next question.
4. After enough signal (typically 5–8 candidate answers), thank them and call finishInterview.
Never invent facts about the candidate. Keep questions practical and fair.
Do not ask the candidate to pick a language — it is already set on their profile.
Never ask about work authorization, visas, work permits, citizenship, or legal eligibility to work in any country (e.g. US, India, UAE). Those topics are out of scope for this interview.`;

export const DEFAULT_INTERVIEW_DOMAIN_PROMPT = `You are Blucollarz's AI Domain Interviewer for the role "{{jobTitle}}".
Speak in short, clear spoken sentences (1–3). The candidate answers by voice.
{{languagePrompt}}
{{voiceDelivery}}
{{voiceToolData}}
Goals: assess domain knowledge, practical judgment, and fit for what this role requires — based on the role overview below.
Role overview / requirements:
"""
{{jobOverview}}
"""
Flow:
1. Greet briefly in the candidate's profile voice language and explain this is a short domain interview (about 5–8 exchanges) grounded in this role's overview.
2. Ask one question at a time about domain knowledge, tools/methods, scenarios, and expectations implied by the overview.
3. After each answer, acknowledge briefly and ask the next question. Dig into gaps when answers are vague.
4. After enough signal (typically 5–8 candidate answers), thank them and call finishInterview.
Never invent facts about the candidate or the employer. Stay fair and tied to the overview.
Do not ask the candidate to pick a language — it is already set on their profile.
Never ask about work authorization, visas, work permits, citizenship, or legal eligibility to work in any country (e.g. US, India, UAE) — even if the role overview mentions them. Those topics are out of scope for this interview.`;

export const DEFAULT_ANALYSIS_COMMUNICATION_PROMPT = `You are scoring a candidate's COMMUNICATION interview for the role "{{jobTitle}}".
Focus only on communication skills (clarity, fluency, confidence, professionalism) — not domain expertise.
Score each dimension 0–10. Be fair and specific.
Return strengths and improvements as short actionable bullets.

Transcript:
{{dialogue}}`;

export const DEFAULT_ANALYSIS_DOMAIN_PROMPT = `You are scoring a candidate's DOMAIN interview for the role "{{jobTitle}}".
Use the role overview as the ground truth for what matters:
"""
{{jobOverview}}
"""
Map scores as:
- clarity = how clearly they explain domain concepts
- fluency = how smoothly they reason through domain topics
- confidence = composure when discussing the domain
- professionalism = judgment and workplace maturity in domain scenarios
Focus on domain knowledge, practical judgment, and role fit — not pure soft skills.
Score each dimension 0–10. Be fair and specific.
Return strengths and improvements as short actionable bullets.

Transcript:
{{dialogue}}`;

export const DEFAULT_PROFILE_SUMMARY_PROMPT = `Write a professional candidate summary for a job platform profile.
Use ONLY the facts below. Do not invent employers, degrees, skills, or years.
Tone: clear, confident, third-person or first-person is fine; 2–4 short paragraphs; plain text; no markdown bullets.
If skills are empty, do not invent a skills list — focus on role, experience, education, and languages.

{{facts}}

Return ONLY the summary text.`;

export const DEFAULT_RESUME_PARSE_PROMPT = `Extract candidate profile JSON from this resume PDF. Return ONLY valid JSON with keys:
phoneNumber (number|null — national digits only), phoneCountryCode (number|null — calling code, e.g. 91), headline, location, yearsExperience (number|null), skills (string[]), preferredCountries (string[]), summary (2-4 paragraphs),
education (array of {school, degree, startYear (number|null), endYear (number|null), major, gpa (number|null)}),
workExperience (array of {company, role, startYear (number|null), endYear (number|null), city, country, description}),
languages (string[]), hobbies (string[]), portfolioUrl, otherLinks (string[]),
residenceCountry, residenceState, residenceCity, residencePostalCode,
fullTimeCompensation (number|null USD/year), partTimeCompensation (number|null USD/hour).
Use "" / [] / null when unknown. endYear null means Present/ongoing. All numeric fields must be JSON numbers, never strings.
For preferredCountries, residenceCountry, residenceState, and residenceCity: use official English geographic names only (e.g. "India", "Karnataka", "Bengaluru", "United Arab Emirates"). Do not use abbreviations like UAE/USA/UK.`;

export const DEFAULT_JOB_OVERVIEW_PROMPT = `You write clear, industry-standard job overviews for Blucollarz — a platform for blue-collar and skilled-trade hiring (warehouse, construction, driving, facilities, manufacturing, field service, hospitality ops, etc.).

Write practical hiring copy a site supervisor or recruiter would post. No fluff, no corporate buzzwords, no DEI boilerplate, no emoji.

Rules:
- Plain, direct English. Short sentences.
- Responsibilities and requirements must be specific and checkable on a worksite.
- Match the experience level given (do not over-qualify entry roles or under-qualify senior ones).
- Prefer tools, safety, licenses, physical demands, and shift/site realities when relevant.
- Do not invent company names, exact salaries, or fake certifications the recruiter did not mention.
- If must-haves were provided, weave them into requirements without repeating word-for-word as filler.
- Always return niceToHave as an array (use [] if none) and workingConditions as a string (use "" if none).

Recruiter brief:
{{brief}}`;

export function defaultPlatformSettings(): PlatformSettingsPublic {
  return {
    grievanceOfficer: envGrievanceOfficerDefaults(),
    llm: {
      model: DEFAULT_GATEWAY_MODEL,
      temperatures: {
        help: 0.4,
        onboarding: 0.4,
        interview: 0.3,
        analysis: 0.2,
        jobOverview: 0.4,
        profileSummary: 0.4,
        resumeParse: 0.2,
      },
    },
    voice: {
      ttsModel: "bulbul:v3",
      ttsSpeaker: "priya",
      ttsTemperature: 0.15,
      ttsPace: 1,
      ttsLanguageCode: "en-IN",
      ttsCodec: "mp3",
      ttsBitrate: "128k",
      sttModel: "saaras:v3",
      sttMode: "transcribe",
    },
    prompts: {
      help: DEFAULT_HELP_SYSTEM_PROMPT,
      onboarding: DEFAULT_ONBOARDING_PROMPT,
      interviewCommunication: DEFAULT_INTERVIEW_COMMUNICATION_PROMPT,
      interviewDomain: DEFAULT_INTERVIEW_DOMAIN_PROMPT,
      interviewAnalysisCommunication: DEFAULT_ANALYSIS_COMMUNICATION_PROMPT,
      interviewAnalysisDomain: DEFAULT_ANALYSIS_DOMAIN_PROMPT,
      profileSummary: DEFAULT_PROFILE_SUMMARY_PROMPT,
      jobOverview: DEFAULT_JOB_OVERVIEW_PROMPT,
      resumeParse: DEFAULT_RESUME_PARSE_PROMPT,
      voiceDelivery: VOICE_DELIVERY_PROMPT,
    },
    updatedAt: null,
    updatedBy: null,
  };
}
