/**
 * Hire-safe profile: employers receive allowlisted resume fields only —
 * never email, DigiLocker id, phone, PAN, Aadhaar, DOB, or address.
 */

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function scrubEducation(list: unknown[]): HireSafeProfile["education"] {
  return list.slice(0, 15).map((raw) => {
    const e = (raw && typeof raw === "object" ? raw : {}) as Record<
      string,
      unknown
    >;
    return {
      school: asString(e.school),
      degree: asString(e.degree),
      startYear: asNumberOrNull(e.startYear),
      endYear: asNumberOrNull(e.endYear),
      major: asString(e.major),
      gpa: asNumberOrNull(e.gpa),
    };
  });
}

function scrubWork(list: unknown[]): HireSafeProfile["workExperience"] {
  return list.slice(0, 20).map((raw) => {
    const e = (raw && typeof raw === "object" ? raw : {}) as Record<
      string,
      unknown
    >;
    return {
      company: asString(e.company),
      role: asString(e.role),
      startYear: asNumberOrNull(e.startYear),
      endYear: asNumberOrNull(e.endYear),
      city: asString(e.city),
      country: asString(e.country),
      description: asString(e.description),
    };
  });
}

/** Allowlisted hire profile fields (matching / evaluation only). */
export type HireSafeProfile = {
  name: string;
  image: string;
  headline: string;
  yearsExperience: number | null;
  skills: string[];
  preferredCountries: string[];
  summary: string;
  education: Array<{
    school: string;
    degree: string;
    startYear: number | null;
    endYear: number | null;
    major: string;
    gpa: number | null;
  }>;
  workExperience: Array<{
    company: string;
    role: string;
    startYear: number | null;
    endYear: number | null;
    city: string;
    country: string;
    description: string;
  }>;
  portfolioUrl: string;
  otherLinks: string[];
  languages: string[];
  hobbies: string[];
  /** true = ECR, false = Non-ECR. */
  isECR: boolean | null;
  fullTimeCompensation: number | null;
  partTimeCompensation: number | null;
};

/**
 * Allowlist scrub — safer than denylist as new PII fields are added.
 */
export function toHireSafeProfile(
  profile: Record<string, unknown>,
): HireSafeProfile {
  return {
    name: asString(profile.name),
    image: asString(profile.image),
    headline: asString(profile.headline),
    yearsExperience: asNumberOrNull(profile.yearsExperience),
    skills: Array.isArray(profile.skills)
      ? profile.skills.filter((s): s is string => typeof s === "string")
      : [],
    preferredCountries: Array.isArray(profile.preferredCountries)
      ? profile.preferredCountries.filter(
          (s): s is string => typeof s === "string",
        )
      : [],
    summary: asString(profile.summary),
    education: Array.isArray(profile.education)
      ? scrubEducation(profile.education)
      : [],
    workExperience: Array.isArray(profile.workExperience)
      ? scrubWork(profile.workExperience)
      : [],
    portfolioUrl: asString(profile.portfolioUrl),
    otherLinks: Array.isArray(profile.otherLinks)
      ? profile.otherLinks.filter((s): s is string => typeof s === "string")
      : [],
    languages: Array.isArray(profile.languages)
      ? profile.languages.filter((s): s is string => typeof s === "string")
      : [],
    hobbies: Array.isArray(profile.hobbies)
      ? profile.hobbies.filter((s): s is string => typeof s === "string")
      : [],
    isECR: typeof profile.isECR === "boolean" ? profile.isECR : null,
    fullTimeCompensation: asNumberOrNull(profile.fullTimeCompensation),
    partTimeCompensation: asNumberOrNull(profile.partTimeCompensation),
  };
}
