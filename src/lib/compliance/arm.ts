/**
 * Hire-safe profile: employers receive allowlisted resume fields only —
 * never email, DigiLocker id, phone, PAN, Aadhaar, DOB, or address.
 */

import type { CandidateProfileData } from "@/lib/candidate/profile";

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
 * Allowlist copy — safer than denylist as new PII fields are added.
 */
export function toHireSafeProfile(
  profile: CandidateProfileData,
): HireSafeProfile {
  return {
    name: profile.name,
    image: profile.image,
    headline: profile.headline,
    yearsExperience: profile.yearsExperience,
    skills: profile.skills,
    preferredCountries: profile.preferredCountries,
    summary: profile.summary,
    education: profile.education.map((entry) => ({
      school: entry.school,
      degree: entry.degree,
      startYear: entry.startYear,
      endYear: entry.endYear,
      major: entry.major,
      gpa: entry.gpa,
    })),
    workExperience: profile.workExperience.map((entry) => ({
      company: entry.company,
      role: entry.role,
      startYear: entry.startYear,
      endYear: entry.endYear,
      city: entry.city,
      country: entry.country,
      description: entry.description,
    })),
    portfolioUrl: profile.portfolioUrl,
    otherLinks: profile.otherLinks,
    languages: profile.languages,
    hobbies: profile.hobbies,
    isECR: profile.isECR,
    fullTimeCompensation: profile.fullTimeCompensation,
    partTimeCompensation: profile.partTimeCompensation,
  };
}
