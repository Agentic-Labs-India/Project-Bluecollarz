/**
 * Attribute Release Matrix (ARM) — scalable conclusions-only release to employers.
 *
 * Counsel rule: employers receive assurance conclusions (AL0–AL4), never raw
 * documents, passport numbers, or contact details.
 */

import type { KycFields } from "@/lib/kyc/types";

export type AssuranceLevel = "AL0" | "AL1" | "AL2" | "AL3" | "AL4";

/** The eight verification attributes from the counsel brief. */
export const VERIFICATION_ATTRIBUTES = [
  "pan",
  "aadhaar",
  "name",
  "email",
  "mobile",
  "education",
  "pcc",
  "passport",
] as const;

export type VerificationAttribute = (typeof VERIFICATION_ATTRIBUTES)[number];

export type AttributeAssuranceStatus =
  | "not_started"
  | "pending"
  | "assured"
  | "needs_review"
  | "failed";

export interface AttributeAssurance {
  status: AttributeAssuranceStatus;
  assuredAt?: string | null;
  source?: string | null;
}

export type AttributeAssuranceMap = Record<
  VerificationAttribute,
  AttributeAssurance
>;

export interface HireAssuranceView {
  identityAssured: boolean;
  qualificationAssured: boolean;
  backgroundAssured: boolean;
  passportAssured: boolean;
  level: AssuranceLevel;
  verifiedAt: string | null;
  provider: string | null;
  /** Per-attribute conclusions only — never raw values. */
  attributes: AttributeAssuranceMap;
}

function asIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value) || null;
}

function emptyAttributes(): AttributeAssuranceMap {
  return {
    pan: { status: "not_started" },
    aadhaar: { status: "not_started" },
    name: { status: "not_started" },
    email: { status: "not_started" },
    mobile: { status: "not_started" },
    education: { status: "not_started" },
    pcc: { status: "not_started" },
    passport: { status: "not_started" },
  };
}

/** Compute AL from which attribute groups are assured. */
function computeAssuranceLevel(
  attrs: AttributeAssuranceMap,
): AssuranceLevel {
  const identity =
    attrs.pan.status === "assured" &&
    attrs.aadhaar.status === "assured" &&
    attrs.name.status === "assured";
  const contact =
    attrs.email.status === "assured" && attrs.mobile.status === "assured";
  const education = attrs.education.status === "assured";
  const pcc = attrs.pcc.status === "assured";
  const passport = attrs.passport.status === "assured";

  if (!identity) return "AL0";
  if (identity && contact && !education && !pcc && !passport) return "AL2";
  if (identity && contact && education && !pcc) return "AL3";
  if (identity && contact && education && pcc && passport) return "AL4";
  if (identity && contact) return "AL2";
  return "AL1";
}

/**
 * Build attribute map from DigiLocker / stored KYC.
 * Contact (email/mobile) and later pipelines come only from persisted attributes.
 */
export function buildAttributeAssuranceFromKyc(
  doc: KycFields | null | undefined,
): AttributeAssuranceMap {
  const attrs = emptyAttributes();
  const pack = doc?.kyc ?? null;
  const verified = doc?.isKycVerified === true;
  const at = asIso(pack?.verifiedAt);
  const source = pack?.provider ? String(pack.provider) : "digilocker";

  if (!verified) return attrs;

  const mark = (key: VerificationAttribute, ok: boolean) => {
    attrs[key] = {
      status: ok ? "assured" : "needs_review",
      assuredAt: ok ? at : null,
      source,
    };
  };

  mark("pan", Boolean(pack?.pan));
  mark("aadhaar", Boolean(pack?.aadhaarLast4));
  mark("name", true);

  const stored = pack?.attributes;
  if (stored && typeof stored === "object") {
    for (const key of VERIFICATION_ATTRIBUTES) {
      const row = stored[key];
      if (!row?.status) continue;
      attrs[key] = {
        status: row.status as AttributeAssuranceStatus,
        assuredAt: row.assuredAt ?? null,
        source: row.source ?? null,
      };
    }
  }

  return attrs;
}

export function toHireAssuranceView(
  doc: KycFields | null | undefined,
): HireAssuranceView {
  const attributes = buildAttributeAssuranceFromKyc(doc);
  const pack = doc?.kyc ?? null;
  const level = computeAssuranceLevel(attributes);
  return {
    identityAssured:
      attributes.pan.status === "assured" &&
      attributes.aadhaar.status === "assured" &&
      attributes.name.status === "assured",
    qualificationAssured: attributes.education.status === "assured",
    backgroundAssured: attributes.pcc.status === "assured",
    passportAssured: attributes.passport.status === "assured",
    level,
    verifiedAt: asIso(pack?.verifiedAt),
    provider: pack?.provider ? String(pack.provider) : null,
    attributes,
  };
}

/** Empty / withheld hire assurance (withdrawn consent or no KYC). */
export function withheldHireAssuranceView(): HireAssuranceView {
  return toHireAssuranceView(null);
}

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
    fullTimeCompensation: asNumberOrNull(profile.fullTimeCompensation),
    partTimeCompensation: asNumberOrNull(profile.partTimeCompensation),
  };
}
