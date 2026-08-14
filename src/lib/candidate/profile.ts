import { z } from "zod";
import { formatZodError } from "@/lib/utils";
import { formatDateOnly, parseDateOnly } from "@/lib/dates";
import {
  normalizeCountryNames,
  normalizeResidencePlace,
} from "@/lib/geo/places";
import { TTS_LANGUAGE_CODES } from "@/lib/voice/languages";

/** Candidate fields stored on the Users document (work profiles). */
export interface CandidateEducationEntry {
  school?: string;
  degree?: string;
  startYear?: number | null;
  /** null = Present / ongoing */
  endYear?: number | null;
  major?: string;
  gpa?: number | null;
}

export interface CandidateWorkEntry {
  company?: string;
  role?: string;
  startYear?: number | null;
  /** null = Present / ongoing */
  endYear?: number | null;
  city?: string;
  country?: string;
  description?: string;
}

export interface CandidateProfileFields {
  /** National phone digits as a number (e.g. 9876543210). */
  phoneNumber?: number | null;
  /** Country calling code as a number (e.g. 91). */
  phoneCountryCode?: number | null;
  headline?: string;
  location?: string;
  yearsExperience?: number | null;
  skills?: string[];
  preferredCountries?: string[];
  summary?: string;
  candidateOnboardingComplete?: boolean;
  education?: CandidateEducationEntry[];
  workExperience?: CandidateWorkEntry[];
  portfolioUrl?: string;
  otherLinks?: string[];
  languages?: string[];
  /** Sarvam voice locale for TTS/STT (e.g. hi-IN). */
  voiceLanguage?: string;
  hobbies?: string[];
  residenceCountry?: string;
  residenceState?: string;
  residenceCity?: string;
  residencePostalCode?: string;
  /** BSON Date (UTC midnight for the calendar day). */
  dateOfBirth?: Date | null;
  /** USD / year */
  fullTimeCompensation?: number | null;
  /** USD / hour */
  partTimeCompensation?: number | null;
  /** DigiLocker-verified identity flag. */
  isKycVerified?: boolean;
  /** Nested DigiLocker identity pack. */
  kyc?: {
    provider?: string;
    verifiedAt?: Date | string | null;
    updatedAt?: Date | string | null;
    aadhaarLast4?: string | null;
    pan?: string | null;
    gender?: string | null;
    apaarId?: string | null;
  } | null;
}

export interface EducationFormEntry {
  school: string;
  degree: string;
  startYear: number | null;
  endYear: number | null;
  major: string;
  gpa: number | null;
}

export interface WorkFormEntry {
  company: string;
  role: string;
  startYear: number | null;
  endYear: number | null;
  city: string;
  country: string;
  description: string;
}

export interface CandidateProfileData {
  name: string;
  email: string;
  image: string;
  phoneNumber: number | null;
  phoneCountryCode: number | null;
  headline: string;
  location: string;
  yearsExperience: number | null;
  skills: string[];
  preferredCountries: string[];
  summary: string;
  candidateOnboardingComplete: boolean;
  education: EducationFormEntry[];
  workExperience: WorkFormEntry[];
  portfolioUrl: string;
  otherLinks: string[];
  languages: string[];
  voiceLanguage: string;
  hobbies: string[];
  residenceCountry: string;
  residenceState: string;
  residenceCity: string;
  residencePostalCode: string;
  /** Wire `yyyy-MM-dd` (empty when unset). Mongo stores BSON Date. */
  dateOfBirth: string;
  fullTimeCompensation: number | null;
  partTimeCompensation: number | null;
  /** DigiLocker identity verified — locks phone/DOB/address/PAN/Aadhaar/gender. */
  isKycVerified: boolean;
  gender: string;
  pan: string;
  aadhaarLast4: string;
  apaarId: string;
}

export const CANDIDATE_MANDATORY_FIELDS = [
  "headline",
  "location",
  "yearsExperience",
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
    startYear: null,
    endYear: null,
    major: "",
    gpa: null,
  };
}

export function emptyWorkEntry(): WorkFormEntry {
  return {
    company: "",
    role: "",
    startYear: null,
    endYear: null,
    city: "",
    country: "",
    description: "",
  };
}

/** Empty candidate profile for UI defaults / null docs. */
export const emptyCandidateProfileData = (): CandidateProfileData => ({
  name: "",
  email: "",
  image: "",
  phoneNumber: null,
  phoneCountryCode: null,
  headline: "",
  location: "",
  yearsExperience: null,
  skills: [],
  preferredCountries: [],
  summary: "",
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
  fullTimeCompensation: null,
  partTimeCompensation: null,
  isKycVerified: false,
  gender: "",
  pan: "",
  aadhaarLast4: "",
  apaarId: "",
});

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

const nullableYear = z.number().int().min(1900).max(2100).nullable();
const nullableGpa = z.number().finite().min(0).max(10).nullable();
const nullableYearsExperience = z.number().int().min(0).max(80).nullable();
const nullableFullTimePay = z.number().finite().min(0).max(10_000_000).nullable();
const nullablePartTimePay = z.number().finite().min(0).max(10_000).nullable();
/** Phone / dial code — numbers only (null when unset). */
const nullablePhoneNumber = z.number().int().positive().nullable();
const nullablePhoneCountryCode = z.number().int().positive().max(9999).nullable();

const educationEntrySchema = z.object({
  school: optionalTrimmed(200),
  degree: optionalTrimmed(120),
  startYear: nullableYear,
  endYear: nullableYear,
  major: optionalTrimmed(120),
  gpa: nullableGpa,
});

const workEntrySchema = z.object({
  company: optionalTrimmed(200),
  role: optionalTrimmed(160),
  startYear: nullableYear,
  endYear: nullableYear,
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

/**
 * Wire format `yyyy-MM-dd` or null — not `z.date()`.
 * `z.date()` cannot convert to JSON Schema (breaks AI tool registration).
 * Mongo still stores BSON Date via candidateUpdateToMongo.
 */
const dateOfBirthSchema = z.preprocess((val) => {
  if (val === null || val === undefined || val === "") return null;
  if (val instanceof Date) {
    const formatted = formatDateOnly(val);
    return formatted || null;
  }
  const parsed = parseDateOnly(val);
  return parsed ? formatDateOnly(parsed) : null;
}, z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()]).refine(
  (value) => {
    if (!value) return true;
    const dob = parseDateOnly(value);
    if (!dob) return false;
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 16);
    return dob <= cutoff;
  },
  { message: "You must be at least 16 years old to use Blucollarz" },
));

export const candidateProfileUpdateSchema = z.object({
  phoneNumber: nullablePhoneNumber,
  phoneCountryCode: nullablePhoneCountryCode,
  headline: optionalTrimmed(200),
  location: optionalTrimmed(160),
  yearsExperience: nullableYearsExperience,
  skills: skillsSchema,
  preferredCountries: countriesSchema,
  summary: optionalTrimmed(6000),
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
  dateOfBirth: dateOfBirthSchema,
  fullTimeCompensation: nullableFullTimePay,
  partTimeCompensation: nullablePartTimePay,
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

function asNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

function mapEducation(
  list: CandidateEducationEntry[] | undefined,
): EducationFormEntry[] {
  if (!Array.isArray(list)) return [];
  return list.slice(0, 15).map((e) => ({
    school: e.school ?? "",
    degree: e.degree ?? "",
    startYear: asNullableNumber(e.startYear),
    endYear: asNullableNumber(e.endYear),
    major: e.major ?? "",
    gpa: asNullableNumber(e.gpa),
  }));
}

function mapWork(list: CandidateWorkEntry[] | undefined): WorkFormEntry[] {
  if (!Array.isArray(list)) return [];
  return list.slice(0, 20).map((e) => ({
    company: e.company ?? "",
    role: e.role ?? "",
    startYear: asNullableNumber(e.startYear),
    endYear: asNullableNumber(e.endYear),
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
  if (!doc) return emptyCandidateProfileData();
  return {
    name: doc.name ?? "",
    email: doc.email ?? "",
    image: doc.image ?? "",
    phoneNumber: asNullableNumber(doc.phoneNumber),
    phoneCountryCode: asNullableNumber(doc.phoneCountryCode),
    headline: doc.headline ?? "",
    location: doc.location ?? "",
    yearsExperience: asNullableNumber(doc.yearsExperience),
    skills: doc.skills ?? [],
    preferredCountries: doc.preferredCountries ?? [],
    summary: doc.summary ?? "",
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
    dateOfBirth: formatDateOnly(doc.dateOfBirth),
    fullTimeCompensation: asNullableNumber(doc.fullTimeCompensation),
    partTimeCompensation: asNullableNumber(doc.partTimeCompensation),
    isKycVerified: Boolean(doc.isKycVerified),
    gender: doc.kyc?.gender ?? "",
    pan: doc.kyc?.pan ?? "",
    aadhaarLast4: doc.kyc?.aadhaarLast4 ?? "",
    apaarId: doc.kyc?.apaarId ?? "",
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
  if (!profile.headline.trim()) missing.push("headline");
  if (!profile.location.trim()) missing.push("location");
  if (profile.yearsExperience === null) missing.push("yearsExperience");
  if (!profile.summary.trim() || profile.summary.trim().length < 40) {
    missing.push("summary");
  }
  if (!hasUsableEducation(profile)) missing.push("education");
  if (!hasUsableWorkExperience(profile)) missing.push("workExperience");
  if (!profile.languages.length) missing.push("languages");
  return missing;
}

/**
 * Gaps the voice coach may ask about.
 * Skills are resume-PDF only; summary is AI-generated at the end — never asked.
 */
export function getMissingInterviewFields(
  profile: CandidateProfileData,
): CandidateMandatoryField[] {
  return getMissingCandidateFields(profile).filter((k) => k !== "summary");
}

export function isInterviewFieldsComplete(
  profile: CandidateProfileData,
): boolean {
  return getMissingInterviewFields(profile).length === 0;
}

export function isCandidateProfileComplete(
  profile: CandidateProfileData,
): boolean {
  return getMissingCandidateFields(profile).length === 0;
}

export const CANDIDATE_FIELD_LABELS: Record<CandidateMandatoryField, string> = {
  headline: "current role or headline",
  location: "location",
  yearsExperience: "years of experience",
  summary: "professional summary / resume content",
  education: "education",
  workExperience: "work experience",
  languages: "languages",
};

export function formatCandidateProfileError(error: z.ZodError): string {
  return formatZodError(error);
}

function setNullableNumber(
  $set: Record<string, unknown>,
  $unset: Record<string, "">,
  key: string,
  value: number | null,
) {
  if (typeof value === "number" && Number.isFinite(value)) $set[key] = value;
  else $unset[key] = "";
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
    "headline",
    "location",
    "summary",
    "portfolioUrl",
    "residenceCountry",
    "residenceState",
    "residenceCity",
    "residencePostalCode",
  ];

  for (const key of stringFields) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) $set[key] = value.trim();
    else $unset[key] = "";
  }

  if (data.dateOfBirth) {
    const dob = parseDateOnly(data.dateOfBirth);
    if (dob) $set.dateOfBirth = dob;
    else $unset.dateOfBirth = "";
  } else {
    $unset.dateOfBirth = "";
  }

  $set.skills = data.skills;
  $set.preferredCountries = data.preferredCountries;
  $set.education = data.education;
  $set.workExperience = data.workExperience;
  $set.otherLinks = data.otherLinks;
  $set.languages = data.languages;
  if (data.voiceLanguage) $set.voiceLanguage = data.voiceLanguage;
  else $unset.voiceLanguage = "";
  $set.hobbies = data.hobbies;

  setNullableNumber($set, $unset, "phoneNumber", data.phoneNumber);
  setNullableNumber($set, $unset, "phoneCountryCode", data.phoneCountryCode);
  setNullableNumber($set, $unset, "yearsExperience", data.yearsExperience);
  setNullableNumber(
    $set,
    $unset,
    "fullTimeCompensation",
    data.fullTimeCompensation,
  );
  setNullableNumber(
    $set,
    $unset,
    "partTimeCompensation",
    data.partTimeCompensation,
  );

  return { $set, $unset };
}

/** Merge a partial patch onto the current profile for tools / resume apply. */
export function mergeCandidateProfilePatch(
  current: CandidateProfileData,
  patch: Partial<CandidateProfileUpdateInput>,
): CandidateProfileUpdateInput {
  const pickStr = (next: string | undefined, prev: string) =>
    next !== undefined && next.trim() ? next : prev;

  const pickNum = (
    next: number | null | undefined,
    prev: number | null,
  ): number | null => (next !== undefined ? next : prev);

  return candidateProfileUpdateSchema.parse(
    sanitizeGeoProfileFields({
      phoneNumber: pickNum(patch.phoneNumber, current.phoneNumber),
      phoneCountryCode: pickNum(
        patch.phoneCountryCode,
        current.phoneCountryCode,
      ),
      headline: pickStr(patch.headline, current.headline),
      location: pickStr(patch.location, current.location),
      yearsExperience: pickNum(patch.yearsExperience, current.yearsExperience),
      skills: patch.skills?.length ? patch.skills : current.skills,
      preferredCountries: patch.preferredCountries?.length
        ? patch.preferredCountries
        : current.preferredCountries,
      summary: pickStr(patch.summary, current.summary),
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
      dateOfBirth:
        patch.dateOfBirth !== undefined
          ? patch.dateOfBirth
          : current.dateOfBirth || null,
      fullTimeCompensation: pickNum(
        patch.fullTimeCompensation,
        current.fullTimeCompensation,
      ),
      partTimeCompensation: pickNum(
        patch.partTimeCompensation,
        current.partTimeCompensation,
      ),
    }),
  );
}
