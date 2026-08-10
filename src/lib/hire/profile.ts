export const COMPANY_SIZES = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1000+",
] as const;
export type CompanySize = (typeof COMPANY_SIZES)[number];

/**
 * Hire company fields on the Users document.
 * Written only from an approved recruiter inquiry — not recruiter-editable.
 */
export interface HireProfileFields {
  contactName?: string;
  companyName?: string;
  website?: string;
  industry?: string;
  companySize?: CompanySize;
  /** Country / HQ location from the access request. */
  location?: string;
  about?: string;
}

/** Client-facing hire company profile (read-only). */
export interface HireProfileData {
  contactName: string;
  companyName: string;
  website: string;
  industry: string;
  companySize: string;
  location: string;
  about: string;
}

const EMPTY_HIRE_PROFILE: HireProfileData = {
  contactName: "",
  companyName: "",
  website: "",
  industry: "",
  companySize: "",
  location: "",
  about: "",
};

export function toHireProfileData(
  doc: HireProfileFields | null | undefined,
): HireProfileData {
  if (!doc) return { ...EMPTY_HIRE_PROFILE };
  return {
    contactName: doc.contactName ?? "",
    companyName: doc.companyName ?? "",
    website: doc.website ?? "",
    industry: doc.industry ?? "",
    companySize: doc.companySize ?? "",
    location: doc.location ?? "",
    about: doc.about ?? "",
  };
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

/** Payload applied to Users when an inquiry is approved. */
export type HireProfileFromInquiry = HireProfileFields & {
  phoneCountryCode: number;
  phoneNumber: number;
};

export function hireProfileFromInquiry(input: {
  contactName: string;
  companyName: string;
  website?: string;
  industry: string;
  companySize: CompanySize | string;
  country: string;
  about: string;
  phoneCountryCode: number;
  phoneNumber: number;
}): HireProfileFromInquiry {
  const companySize = COMPANY_SIZES.includes(input.companySize as CompanySize)
    ? (input.companySize as CompanySize)
    : undefined;
  return {
    contactName: input.contactName.trim(),
    companyName: input.companyName.trim(),
    website: (input.website || "").trim() || undefined,
    industry: input.industry.trim(),
    ...(companySize ? { companySize } : {}),
    location: input.country.trim(),
    about: input.about.trim(),
    phoneCountryCode: input.phoneCountryCode,
    phoneNumber: input.phoneNumber,
  };
}
