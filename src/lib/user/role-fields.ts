/**
 * Field sets on the shared Users document that belong to one profile role.
 * Used when promoting/demoting so leftover keys do not pollute Mongo.
 */

/** Candidate-only profile fields (not shared with hire). */
export const CANDIDATE_ONLY_USER_FIELDS = [
  "headline",
  "yearsExperience",
  "skills",
  "preferredCountries",
  "summary",
  "education",
  "workExperience",
  "portfolioUrl",
  "otherLinks",
  "languages",
  "voiceLanguage",
  "hobbies",
  "residenceCountry",
  "residenceState",
  "residenceCity",
  "residencePostalCode",
  "dateOfBirth",
  "fullTimeCompensation",
  "partTimeCompensation",
  "candidateOnboardingComplete",
] as const;

/** Hire-only company profile fields. */
export const HIRE_ONLY_USER_FIELDS = [
  "companyName",
  "tagline",
  "website",
  "industry",
  "companySize",
  "about",
  "certificates",
] as const;

/** DigiLocker KYC fields on Users. */
export const KYC_USER_FIELDS = ["isKycVerified", "kyc"] as const;

/** Removed / leftover fields that should never linger. */
export const LEGACY_USER_FIELDS = [
  "workAuthorization",
  "workAuthConfirmed",
  "workAuthStayAgreed",
  "resumeUrl",
  "resumeSource",
] as const;

export function unsetFields(
  keys: readonly string[],
): Record<string, ""> {
  const $unset: Record<string, ""> = {};
  for (const key of keys) $unset[key] = "";
  return $unset;
}
