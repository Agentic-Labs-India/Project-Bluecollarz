import { z } from "zod";
import { formatZodError } from "@/lib/utils";

export const COMPANY_SIZES = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1000+",
] as const;
export type CompanySize = (typeof COMPANY_SIZES)[number];

export interface HireCertificate {
  id: string;
  name: string;
  issuer?: string;
  /** Calendar year, stored as BSON number. */
  year?: number;
}

/**
 * Extended hiring fields stored directly on the user document
 * (Users collection) for hire-profile users.
 */
export interface HireProfileFields {
  companyName?: string;
  tagline?: string;
  website?: string;
  industry?: string;
  companySize?: CompanySize;
  location?: string;
  about?: string;
  certificates?: HireCertificate[];
}

/** Client-facing shape of the editable hire profile. */
export interface HireProfileData {
  companyName: string;
  tagline: string;
  website: string;
  industry: string;
  companySize: string;
  location: string;
  about: string;
  certificates: HireCertificate[];
}

const EMPTY_HIRE_PROFILE: HireProfileData = {
  companyName: "",
  tagline: "",
  website: "",
  industry: "",
  companySize: "",
  location: "",
  about: "",
  certificates: [],
};

const optionalTrimmed = (max: number) =>
  z.preprocess((val) => {
    if (val === null || val === undefined) return "";
    return String(val).trim();
  }, z.string().max(max));

const optionalYear = z.number().int().min(1900).max(2100).optional();

const certificateSchema = z.object({
  id: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1, "Certificate name is required").max(160),
  issuer: optionalTrimmed(160).optional(),
  year: optionalYear,
});

export const hireProfileUpdateSchema = z.object({
  companyName: optionalTrimmed(160),
  tagline: optionalTrimmed(200),
  website: optionalTrimmed(200),
  industry: optionalTrimmed(120),
  companySize: z.preprocess(
    (val) => (val === null || val === undefined ? "" : String(val).trim()),
    z.union([z.enum(COMPANY_SIZES), z.literal("")]),
  ),
  location: optionalTrimmed(160),
  about: optionalTrimmed(4000),
  certificates: z.array(certificateSchema).max(20),
});

function normalizeCertificate(cert: HireCertificate): HireCertificate {
  return {
    id: cert.id,
    name: cert.name,
    ...(cert.issuer ? { issuer: cert.issuer } : {}),
    ...(typeof cert.year === "number" ? { year: cert.year } : {}),
  };
}

export function toHireProfileData(
  doc: HireProfileFields | null | undefined,
): HireProfileData {
  if (!doc) return { ...EMPTY_HIRE_PROFILE };
  return {
    companyName: doc.companyName ?? "",
    tagline: doc.tagline ?? "",
    website: doc.website ?? "",
    industry: doc.industry ?? "",
    companySize: doc.companySize ?? "",
    location: doc.location ?? "",
    about: doc.about ?? "",
    certificates: (doc.certificates ?? []).map(normalizeCertificate),
  };
}

export function formatHireProfileError(error: z.ZodError): string {
  return formatZodError(error);
}

export type HireMandatoryField =
  | "companyName"
  | "industry"
  | "companySize"
  | "location"
  | "about";

export const HIRE_FIELD_LABELS: Record<HireMandatoryField, string> = {
  companyName: "company name",
  industry: "industry",
  companySize: "company size",
  location: "location",
  about: "about the company",
};

export function getMissingHireFields(
  profile: HireProfileData,
): HireMandatoryField[] {
  const missing: HireMandatoryField[] = [];
  if (!profile.companyName.trim()) missing.push("companyName");
  if (!profile.industry.trim()) missing.push("industry");
  if (!profile.companySize.trim()) missing.push("companySize");
  if (!profile.location.trim()) missing.push("location");
  if (!profile.about.trim()) missing.push("about");
  return missing;
}

export function isHireProfileComplete(profile: HireProfileData): boolean {
  return getMissingHireFields(profile).length === 0;
}
