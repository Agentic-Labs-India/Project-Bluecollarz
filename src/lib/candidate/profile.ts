import { z } from "zod";
import { asOptionalNumber, formatZodError } from "@/lib/utils";
import {
  normalizeCountryNames,
  normalizeResidencePlace,
} from "@/lib/geo/places";
import { TTS_LANGUAGE_CODES } from "@/lib/voice/languages";

/** Candidate fields stored on the Users document (work profiles). */
export interface CandidateEducationEntry {
  school?: string;
  degree?: string;
  startYear?: string;
  endYear?: string;
  major?: string;
  gpa?: string;
}

export interface CandidateWorkEntry {
  company?: string;
  role?: string;
  startYear?: string;
  endYear?: string;
  city?: string;
  country?: string;
  description?: string;
}

export interface CandidateProfileFields {
  phoneNumber?: string;
  headline?: string;
  location?: string;
  yearsExperience?: number;
  skills?: string[];
  workAuthorization?: string;
  preferredCountries?: string[];
  summary?: string;
  resumeUrl?: string;
  resumeSource?: "upload" | "voice";
  candidateOnboardingComplete?: boolean;
  education?: CandidateEducationEntry[];
  workExperience?: CandidateWorkEntry[];
  portfolioUrl?: string;
  otherLinks?: string[];
  languages?: string[];
  /** Sarvam voice locale for TTS/STT (e.g. hi-IN). Set in onboarding; editable on profile. */
  voiceLanguage?: string;
  hobbies?: string[];
  residenceCountry?: string;
  residenceState?: string;
  residenceCity?: string;
  residencePostalCode?: string;
  dateOfBirth?: string;
  workAuthConfirmed?: boolean;
  workAuthStayAgreed?: boolean;
  fullTimeCompensation?: string;
  partTimeCompensation?: string;
}

export interface EducationFormEntry {
  school: string;
  degree: string;
  startYear: string;
  endYear: string;
  major: string;
  gpa: string;
}

export interface WorkFormEntry {
  company: string;
  role: string;
  startYear: string;
  endYear: string;
  city: string;
  country: string;
  description: string;
}

export interface CandidateProfileData {
  name: string;
  email: string;
  image: string;
  phoneNumber: string;
  headline: string;
  location: string;
  yearsExperience: string;
  skills: string[];
  workAuthorization: string;
  preferredCountries: string[];
  summary: string;
  resumeUrl: string;
  resumeSource: "" | "upload" | "voice";
  candidateOnboardingComplete: boolean;
  education: EducationFormEntry[];
  workExperience: WorkFormEntry[];
  portfolioUrl: string;
  otherLinks: string[];
  languages: string[];
  /** Sarvam BCP-47 voice locale (en-IN, hi-IN, …). */
  voiceLanguage: string;
  hobbies: string[];
  residenceCountry: string;
  residenceState: string;
  residenceCity: string;
  residencePostalCode: string;
  dateOfBirth: string;
  workAuthConfirmed: boolean;
  workAuthStayAgreed: boolean;
  fullTimeCompensation: string;
  partTimeCompensation: string;
}

export const CANDIDATE_MANDATORY_FIELDS = [
  "phoneNumber",
  "headline",
  "location",
  "yearsExperience",
  "skills",
  "workAuthorization",
  "summary",
  "education",
  "workExperience",
  "languages",
] as const;

export type CandidateMandatoryField = (typeof CANDIDATE_MANDATORY_FIELDS)[number];

export const HOBBY_PRESETS = [
  "Football",
  "Basketball",
  "Cricket",
  "Badminton",
  "Running",
  "Gym",
  "Reading",
  "Cooking",
  "Travel",
  "Music",
  "Gaming",
  "Photography",
] as const;

export function emptyEducationEntry(): EducationFormEntry {
  return {
    school: "",
    degree: "",
    startYear: "",
    endYear: "",
    major: "",
    gpa: "",
  };
}

export function emptyWorkEntry(): WorkFormEntry {
  return {
    company: "",
    role: "",
    startYear: "",
    endYear: "",
    city: "",
    country: "",
    description: "",
  };
}

const EMPTY: CandidateProfileData = {
  name: "",
  email: "",
  image: "",
  phoneNumber: "",
  headline: "",
  location: "",
  yearsExperience: "",
  skills: [],
  workAuthorization: "",
  preferredCountries: [],
  summary: "",
  resumeUrl: "",
  resumeSource: "",
  candidateOnboardingComplete: false,
  education: [],
  workExperience: [],
  portfolioUrl: "",
  otherLinks: [],
  languages: [],
  voiceLanguage: "",
  hobbies: [],
  residenceCountry: "",
  residenceState: "",
  residenceCity: "",
  residencePostalCode: "",
  dateOfBirth: "",
  workAuthConfirmed: false,
  workAuthStayAgreed: false,
  fullTimeCompensation: "",
  partTimeCompensation: "",
};

const optionalTrimmed = (max: number) =>
  z.preprocess((val) => {
    if (val === null || val === undefined) return "";
    return String(val).trim();
  }, z.string().max(max));

const stringListSchema = (maxItems: number, maxLen: number) =>
  z.preprocess((val) => {
    if (!Array.isArray(val)) return [];
    return val
      .map((s) => String(s ?? "").trim())
      .filter(Boolean)
      .slice(0, maxItems);
  }, z.array(z.string().min(1).max(maxLen)).max(maxItems));

const skillsSchema = stringListSchema(40, 80);
const countriesSchema = stringListSchema(20, 80);
const languagesSchema = stringListSchema(20, 80);
const hobbiesSchema = stringListSchema(30, 80);
const otherLinksSchema = stringListSchema(10, 500);

const voiceLanguageSchema = z.preprocess((val) => {
  if (val === null || val === undefined) return "";
  return String(val).trim();
}, z.union([z.enum(TTS_LANGUAGE_CODES), z.literal("")]));

const educationEntrySchema = z.object({
  school: optionalTrimmed(200),
  degree: optionalTrimmed(120),
  startYear: optionalTrimmed(10),
  endYear: optionalTrimmed(10),
  major: optionalTrimmed(120),
  gpa: optionalTrimmed(20),
});

const workEntrySchema = z.object({
  company: optionalTrimmed(200),
  role: optionalTrimmed(160),
  startYear: optionalTrimmed(10),
  endYear: optionalTrimmed(20),
  city: optionalTrimmed(120),
  country: optionalTrimmed(80),
  description: optionalTrimmed(4000),
});

const educationListSchema = z.preprocess((val) => {
  if (!Array.isArray(val)) return [];
  return val.slice(0, 15);
}, z.array(educationEntrySchema).max(15));

const workListSchema = z.preprocess((val) => {
  if (!Array.isArray(val)) return [];
  return val.slice(0, 20);
}, z.array(workEntrySchema).max(20));

const boolSchema = z.preprocess((val) => {
  if (val === true || val === "true" || val === 1 || val === "1") return true;
  return false;
}, z.boolean());

export const candidateProfileUpdateSchema = z.object({
  phoneNumber: optionalTrimmed(40),
  headline: optionalTrimmed(200),
  location: optionalTrimmed(160),
  yearsExperience: z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return "";
    const n = asOptionalNumber(val);
    return n === undefined ? val : String(n);
  }, z.union([z.string().max(10), z.literal("")])),
  skills: skillsSchema,
  workAuthorization: optionalTrimmed(200),
  preferredCountries: countriesSchema,
  summary: optionalTrimmed(6000),
  resumeUrl: optionalTrimmed(2000),
  resumeSource: z.enum(["", "upload", "voice"]),
  education: educationListSchema,
  workExperience: workListSchema,
  portfolioUrl: optionalTrimmed(500),
  otherLinks: otherLinksSchema,
  languages: languagesSchema,
  voiceLanguage: voiceLanguageSchema,
  hobbies: hobbiesSchema,
  residenceCountry: optionalTrimmed(80),
  residenceState: optionalTrimmed(80),
  residenceCity: optionalTrimmed(80),
  residencePostalCode: optionalTrimmed(20),
  dateOfBirth: optionalTrimmed(20),
  workAuthConfirmed: boolSchema,
  workAuthStayAgreed: boolSchema,
  fullTimeCompensation: optionalTrimmed(40),
  partTimeCompensation: optionalTrimmed(40),
});

export type CandidateProfileUpdateInput = z.infer<
  typeof candidateProfileUpdateSchema
>;

/** Coerce geo fields to official country-state-city names. */
export function sanitizeGeoProfileFields<
  T extends Partial<
    Pick<
      CandidateProfileUpdateInput,
      | "preferredCountries"
      | "residenceCountry"
      | "residenceState"
      | "residenceCity"
    >
  >,
>(data: T): T {
  const next = { ...data };
  if (next.preferredCountries !== undefined) {
    next.preferredCountries = normalizeCountryNames(next.preferredCountries);
  }
  if (
    next.residenceCountry !== undefined ||
    next.residenceState !== undefined ||
    next.residenceCity !== undefined
  ) {
    const place = normalizeResidencePlace({
      country: next.residenceCountry ?? "",
      state: next.residenceState ?? "",
      city: next.residenceCity ?? "",
    });
    next.residenceCountry = place.country;
    next.residenceState = place.state;
    next.residenceCity = place.city;
  }
  return next;
}

function mapEducation(
  list: CandidateEducationEntry[] | undefined,
): EducationFormEntry[] {
  if (!Array.isArray(list)) return [];
  return list.slice(0, 15).map((e) => ({
    school: e.school ?? "",
    degree: e.degree ?? "",
    startYear: e.startYear ?? "",
    endYear: e.endYear ?? "",
    major: e.major ?? "",
    gpa: e.gpa ?? "",
  }));
}

function mapWork(list: CandidateWorkEntry[] | undefined): WorkFormEntry[] {
  if (!Array.isArray(list)) return [];
  return list.slice(0, 20).map((e) => ({
    company: e.company ?? "",
    role: e.role ?? "",
    startYear: e.startYear ?? "",
    endYear: e.endYear ?? "",
    city: e.city ?? "",
    country: e.country ?? "",
    description: e.description ?? "",
  }));
}

export function toCandidateProfileData(
  doc:
    | (CandidateProfileFields & {
        name?: string | null;
        email?: string | null;
        image?: string | null;
      })
    | null
    | undefined,
): CandidateProfileData {
  if (!doc) {
    return {
      ...EMPTY,
      skills: [],
      preferredCountries: [],
      education: [],
      workExperience: [],
      otherLinks: [],
      languages: [],
      voiceLanguage: "",
      hobbies: [],
    };
  }
  const years = doc.yearsExperience;
  return {
    name: doc.name ?? "",
    email: doc.email ?? "",
    image: doc.image ?? "",
    phoneNumber: doc.phoneNumber ?? "",
    headline: doc.headline ?? "",
    location: doc.location ?? "",
    yearsExperience:
      years === undefined || years === null ? "" : String(years),
    skills: doc.skills ?? [],
    workAuthorization: doc.workAuthorization ?? "",
    preferredCountries: doc.preferredCountries ?? [],
    summary: doc.summary ?? "",
    resumeUrl: doc.resumeUrl ?? "",
    resumeSource: doc.resumeSource ?? "",
    candidateOnboardingComplete: Boolean(doc.candidateOnboardingComplete),
    education: mapEducation(doc.education),
    workExperience: mapWork(doc.workExperience),
    portfolioUrl: doc.portfolioUrl ?? "",
    otherLinks: doc.otherLinks ?? [],
    languages: doc.languages ?? [],
    voiceLanguage: doc.voiceLanguage ?? "",
    hobbies: doc.hobbies ?? [],
    residenceCountry: doc.residenceCountry ?? "",
    residenceState: doc.residenceState ?? "",
    residenceCity: doc.residenceCity ?? "",
    residencePostalCode: doc.residencePostalCode ?? "",
    dateOfBirth: doc.dateOfBirth ?? "",
    workAuthConfirmed: Boolean(doc.workAuthConfirmed),
    workAuthStayAgreed: Boolean(doc.workAuthStayAgreed),
    fullTimeCompensation: doc.fullTimeCompensation ?? "",
    partTimeCompensation: doc.partTimeCompensation ?? "",
  };
}

function hasUsableEducation(profile: CandidateProfileData): boolean {
  return profile.education.some(
    (e) => e.school.trim() || e.degree.trim() || e.major.trim(),
  );
}

function hasUsableWorkExperience(profile: CandidateProfileData): boolean {
  return profile.workExperience.some(
    (e) => e.company.trim() || e.role.trim() || e.description.trim(),
  );
}

/** Missing mandatory keys for onboarding gate. */
export function getMissingCandidateFields(
  profile: CandidateProfileData,
): CandidateMandatoryField[] {
  const missing: CandidateMandatoryField[] = [];
  if (!profile.phoneNumber.trim()) missing.push("phoneNumber");
  if (!profile.headline.trim()) missing.push("headline");
  if (!profile.location.trim()) missing.push("location");
  if (profile.yearsExperience.trim() === "") missing.push("yearsExperience");
  if (!profile.skills.length) missing.push("skills");
  if (!profile.workAuthorization.trim()) missing.push("workAuthorization");
  if (!profile.summary.trim() || profile.summary.trim().length < 40) {
    missing.push("summary");
  }
  if (!hasUsableEducation(profile)) missing.push("education");
  if (!hasUsableWorkExperience(profile)) missing.push("workExperience");
  if (!profile.languages.length) missing.push("languages");
  return missing;
}

export function isCandidateProfileComplete(
  profile: CandidateProfileData,
): boolean {
  return getMissingCandidateFields(profile).length === 0;
}

export const CANDIDATE_FIELD_LABELS: Record<CandidateMandatoryField, string> = {
  phoneNumber: "phone number",
  headline: "current role or headline",
  location: "location",
  yearsExperience: "years of experience",
  skills: "skills",
  workAuthorization: "work authorization",
  summary: "professional summary / resume content",
  education: "education",
  workExperience: "work experience",
  languages: "languages",
};

export function formatCandidateProfileError(error: z.ZodError): string {
  return formatZodError(error);
}

/** Build Mongo $set / $unset from a validated update payload. */
export function candidateUpdateToMongo(
  data: CandidateProfileUpdateInput,
  complete: boolean,
): { $set: Record<string, unknown>; $unset: Record<string, ""> } {
  const $set: Record<string, unknown> = {
    candidateOnboardingComplete: complete,
  };
  const $unset: Record<string, ""> = {};

  const stringFields: Array<keyof CandidateProfileUpdateInput> = [
    "phoneNumber",
    "headline",
    "location",
    "workAuthorization",
    "summary",
    "resumeUrl",
    "portfolioUrl",
    "residenceCountry",
    "residenceState",
    "residenceCity",
    "residencePostalCode",
    "dateOfBirth",
    "fullTimeCompensation",
    "partTimeCompensation",
  ];

  for (const key of stringFields) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) $set[key] = value.trim();
    else $unset[key] = "";
  }

  if (data.resumeSource) $set.resumeSource = data.resumeSource;
  else $unset.resumeSource = "";

  $set.skills = data.skills;
  $set.preferredCountries = data.preferredCountries;
  $set.education = data.education;
  $set.workExperience = data.workExperience;
  $set.otherLinks = data.otherLinks;
  $set.languages = data.languages;
  if (data.voiceLanguage) $set.voiceLanguage = data.voiceLanguage;
  else $unset.voiceLanguage = "";
  $set.hobbies = data.hobbies;
  $set.workAuthConfirmed = data.workAuthConfirmed;
  $set.workAuthStayAgreed = data.workAuthStayAgreed;

  const years = asOptionalNumber(data.yearsExperience);
  if (years !== undefined) $set.yearsExperience = years;
  else $unset.yearsExperience = "";

  return { $set, $unset };
}

/** Merge a partial patch onto the current profile for tools / resume apply. */
export function mergeCandidateProfilePatch(
  current: CandidateProfileData,
  patch: Partial<CandidateProfileUpdateInput>,
): CandidateProfileUpdateInput {
  const pickStr = (next: string | undefined, prev: string) =>
    next !== undefined && next.trim() ? next : prev;

  return candidateProfileUpdateSchema.parse(
    sanitizeGeoProfileFields({
      phoneNumber: pickStr(patch.phoneNumber, current.phoneNumber),
      headline: pickStr(patch.headline, current.headline),
      location: pickStr(patch.location, current.location),
      yearsExperience:
        patch.yearsExperience !== undefined && patch.yearsExperience !== ""
          ? patch.yearsExperience
          : current.yearsExperience,
      skills: patch.skills?.length ? patch.skills : current.skills,
      workAuthorization: pickStr(
        patch.workAuthorization,
        current.workAuthorization,
      ),
      preferredCountries: patch.preferredCountries?.length
        ? patch.preferredCountries
        : current.preferredCountries,
      summary: pickStr(patch.summary, current.summary),
      resumeUrl:
        patch.resumeUrl !== undefined ? patch.resumeUrl : current.resumeUrl,
      resumeSource:
        patch.resumeSource !== undefined && patch.resumeSource !== ""
          ? patch.resumeSource
          : current.resumeSource || "",
      education:
        patch.education !== undefined ? patch.education : current.education,
      workExperience:
        patch.workExperience !== undefined
          ? patch.workExperience
          : current.workExperience,
      portfolioUrl: pickStr(patch.portfolioUrl, current.portfolioUrl),
      otherLinks:
        patch.otherLinks !== undefined ? patch.otherLinks : current.otherLinks,
      languages:
        patch.languages !== undefined ? patch.languages : current.languages,
      voiceLanguage:
        patch.voiceLanguage !== undefined
          ? patch.voiceLanguage
          : current.voiceLanguage,
      hobbies: patch.hobbies !== undefined ? patch.hobbies : current.hobbies,
      residenceCountry: pickStr(
        patch.residenceCountry,
        current.residenceCountry,
      ),
      residenceState: pickStr(patch.residenceState, current.residenceState),
      residenceCity: pickStr(patch.residenceCity, current.residenceCity),
      residencePostalCode: pickStr(
        patch.residencePostalCode,
        current.residencePostalCode,
      ),
      dateOfBirth: pickStr(patch.dateOfBirth, current.dateOfBirth),
      workAuthConfirmed:
        patch.workAuthConfirmed !== undefined
          ? patch.workAuthConfirmed
          : current.workAuthConfirmed,
      workAuthStayAgreed:
        patch.workAuthStayAgreed !== undefined
          ? patch.workAuthStayAgreed
          : current.workAuthStayAgreed,
      fullTimeCompensation: pickStr(
        patch.fullTimeCompensation,
        current.fullTimeCompensation,
      ),
      partTimeCompensation: pickStr(
        patch.partTimeCompensation,
        current.partTimeCompensation,
      ),
    }),
  );
}
