import { z } from "zod";
import { COMPANY_DOC_MAX_BYTES } from "@/lib/blob/pathname";
import { RECRUITER_INDUSTRIES } from "@/lib/hire/inquiries/types";
import { listStatesForCountry } from "@/lib/core/geo/places";

export const HIRE_ONBOARDING_STATUSES = [
  "draft",
  "submitted",
  "verified",
  "rejected",
] as const;
export type HireOnboardingStatus = (typeof HIRE_ONBOARDING_STATUSES)[number];

export const LEGAL_LICENCE_TYPES = [
  "Commercial License",
  "Trade License",
  "Tax Registration",
  "VAT Registration",
  "Municipality License",
  "Other",
] as const;
export type LegalLicenceType = (typeof LEGAL_LICENCE_TYPES)[number];

export const GCC_RULE_KEYS = [
  "kafalaActive",
  "accommodationCapacity",
  "wpsEnrolled",
  "groupInsuranceValid",
] as const;
export type GccRuleKey = (typeof GCC_RULE_KEYS)[number];

export const GCC_RULE_LABELS: Record<GccRuleKey, string> = {
  kafalaActive: "Kafala sponsorship file active",
  accommodationCapacity:
    "Employer-provided accommodation capacity ≥ foreign workers",
  wpsEnrolled: "Wage Protection System (WPS) enrolled",
  groupInsuranceValid: "Group worker insurance valid",
};

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform((v) => v ?? "");

const nullableInt = z
  .number()
  .int()
  .nonnegative()
  .nullable()
  .optional()
  .transform((v) => (typeof v === "number" ? v : null));

const nullableIso2 = z
  .union([z.string().length(2), z.null()])
  .optional()
  .transform((v) => {
    const t = (v ?? "").trim().toUpperCase();
    return /^[A-Z]{2}$/.test(t) ? t : null;
  });

const nullableStateCode = z
  .union([z.string().trim().max(10), z.null()])
  .optional()
  .transform((v) => {
    const t = (v ?? "").trim().toUpperCase();
    return t || null;
  });

const nullableDial = z
  .number()
  .int()
  .positive()
  .nullable()
  .optional()
  .transform((v) => (typeof v === "number" ? v : null));

const dateOnly = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .or(z.literal(""))
  .optional()
  .transform((v) => v ?? "");

export const hireOnboardingDocumentSchema = z.object({
  url: z.string().url().max(2000),
  pathname: z.string().trim().min(1).max(500),
  filename: z.string().trim().min(1).max(200),
  contentType: z.string().trim().min(1).max(120),
  size: z.number().int().positive().max(COMPANY_DOC_MAX_BYTES),
  uploadedAt: z.string().trim().min(1).max(40),
});
export type HireOnboardingDocument = z.infer<
  typeof hireOnboardingDocumentSchema
>;

const nullableDocument = hireOnboardingDocumentSchema.nullable();

export const hireOnboardingContactSchema = z.object({
  name: optionalText(120),
  nationalityCode: nullableIso2,
  phoneCountryCode: nullableDial,
  phoneNumber: nullableDial,
  email: optionalText(200),
});
export type HireOnboardingContact = z.infer<typeof hireOnboardingContactSchema>;

export const hireOnboardingIdentitySchema = z.object({
  legalName: optionalText(160),
  tradeName: optionalText(160),
  registrationNumber: optionalText(80),
  taxVatId: optionalText(80),
  chamberId: optionalText(80),
  sponsorId: optionalText(80),
  yearEstablished: z
    .number()
    .int()
    .min(1800)
    .max(2100)
    .nullable()
    .optional()
    .transform((v) => (typeof v === "number" ? v : null)),
  website: optionalText(200),
});
export type HireOnboardingIdentity = z.infer<
  typeof hireOnboardingIdentitySchema
>;

export const hireOnboardingLocationSchema = z.object({
  countryCode: nullableIso2,
  stateCode: nullableStateCode,
  city: optionalText(80),
  address: optionalText(300),
  industry: z
    .union([z.enum(RECRUITER_INDUSTRIES), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v && v.length ? v : null)),
  totalEmployees: nullableInt,
  foreignWorkers: nullableInt,
  nationalEmployees: nullableInt,
  blueCollarCount: nullableInt,
});
export type HireOnboardingLocation = z.infer<
  typeof hireOnboardingLocationSchema
>;

export const hireOnboardingContactsSchema = z.object({
  owner: hireOnboardingContactSchema,
  hr: hireOnboardingContactSchema,
  operations: hireOnboardingContactSchema,
  finance: hireOnboardingContactSchema,
  immigration: hireOnboardingContactSchema,
});
export type HireOnboardingContacts = z.infer<
  typeof hireOnboardingContactsSchema
>;

export const hireOnboardingGccSchema = z.object({
  kafalaActive: z.boolean(),
  accommodationCapacity: z.boolean(),
  wpsEnrolled: z.boolean(),
  groupInsuranceValid: z.boolean(),
});
export type HireOnboardingGcc = z.infer<typeof hireOnboardingGccSchema>;

export const hireOnboardingSponsorshipSchema = z.object({
  type: optionalText(80),
  number: optionalText(80),
  category: optionalText(80),
  workerLimit: nullableInt,
  usedSlots: nullableInt,
  expiry: dateOnly,
});
export type HireOnboardingSponsorship = z.infer<
  typeof hireOnboardingSponsorshipSchema
>;

export const hireOnboardingLicenceSchema = z.object({
  id: z.string().trim().min(8).max(80),
  type: z.enum(LEGAL_LICENCE_TYPES),
  number: optionalText(80),
  issuedAt: dateOnly,
  expiryAt: dateOnly,
  document: nullableDocument,
});
export type HireOnboardingLicence = z.infer<typeof hireOnboardingLicenceSchema>;

export const hireOnboardingDocumentsSchema = z.object({
  establishmentCard: nullableDocument,
  immigrationFile: nullableDocument,
});
export type HireOnboardingDocuments = z.infer<
  typeof hireOnboardingDocumentsSchema
>;

/** Full draft snapshot written on autosave. Status is server-owned. */
export const hireOnboardingSaveSchema = z.object({
  identity: hireOnboardingIdentitySchema,
  location: hireOnboardingLocationSchema,
  contacts: hireOnboardingContactsSchema,
  gccRules: hireOnboardingGccSchema,
  sponsorshipLicence: hireOnboardingSponsorshipSchema,
  legalLicences: z.array(hireOnboardingLicenceSchema).max(20),
  documents: hireOnboardingDocumentsSchema,
});
export type HireOnboardingSaveInput = z.infer<typeof hireOnboardingSaveSchema>;

export interface HireOnboardingData extends HireOnboardingSaveInput {
  id: string;
  userId: string;
  status: HireOnboardingStatus;
  adminNote: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedByEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HireOnboardingListItem extends HireOnboardingData {
  companyName: string;
  email: string;
  contactName: string;
}

export const HIRE_ONBOARDING_CONTACT_KEYS = [
  "owner",
  "hr",
  "operations",
  "finance",
  "immigration",
] as const;
export type HireOnboardingContactKey =
  (typeof HIRE_ONBOARDING_CONTACT_KEYS)[number];

export const HIRE_ONBOARDING_CONTACT_LABELS: Record<
  HireOnboardingContactKey,
  string
> = {
  owner: "Owner",
  hr: "HR manager",
  operations: "Operations",
  finance: "Finance",
  immigration: "Immigration / PRO",
};

export function toHireOnboardingSave(
  data: HireOnboardingSaveInput,
): HireOnboardingSaveInput {
  return {
    identity: data.identity,
    location: data.location,
    contacts: data.contacts,
    gccRules: data.gccRules,
    sponsorshipLicence: data.sponsorshipLicence,
    legalLicences: data.legalLicences,
    documents: data.documents,
  };
}

function emptyContact(): HireOnboardingContact {
  return {
    name: "",
    nationalityCode: null,
    phoneCountryCode: null,
    phoneNumber: null,
    email: "",
  };
}

export function emptyHireOnboardingSave(): HireOnboardingSaveInput {
  return {
    identity: {
      legalName: "",
      tradeName: "",
      registrationNumber: "",
      taxVatId: "",
      chamberId: "",
      sponsorId: "",
      yearEstablished: null,
      website: "",
    },
    location: {
      countryCode: null,
      stateCode: null,
      city: "",
      address: "",
      industry: null,
      totalEmployees: null,
      foreignWorkers: null,
      nationalEmployees: null,
      blueCollarCount: null,
    },
    contacts: {
      owner: emptyContact(),
      hr: emptyContact(),
      operations: emptyContact(),
      finance: emptyContact(),
      immigration: emptyContact(),
    },
    gccRules: {
      kafalaActive: false,
      accommodationCapacity: false,
      wpsEnrolled: false,
      groupInsuranceValid: false,
    },
    sponsorshipLicence: {
      type: "",
      number: "",
      category: "",
      workerLimit: null,
      usedSlots: null,
      expiry: "",
    },
    legalLicences: [],
    documents: {
      establishmentCard: null,
      immigrationFile: null,
    },
  };
}

export function getMissingOnboardingFields(
  data: HireOnboardingSaveInput,
): string[] {
  const missing: string[] = [];
  if (!data.identity.legalName.trim()) missing.push("legal name");
  if (!data.identity.registrationNumber.trim()) {
    missing.push("registration number");
  }
  if (!data.identity.taxVatId.trim()) missing.push("tax / VAT ID");
  if (!data.location.countryCode) missing.push("country");
  if (
    data.location.countryCode &&
    listStatesForCountry(data.location.countryCode).length > 0 &&
    !data.location.stateCode
  ) {
    missing.push("state");
  }
  if (!data.location.city.trim()) missing.push("city");
  if (!data.location.address.trim()) missing.push("address");
  if (!data.contacts.owner.name.trim()) missing.push("owner name");
  if (!data.contacts.owner.nationalityCode) missing.push("owner nationality");
  if (!data.contacts.owner.email.trim()) missing.push("owner email");
  if (!data.documents.establishmentCard) missing.push("establishment card");
  if (!data.documents.immigrationFile) missing.push("immigration file");
  for (const key of GCC_RULE_KEYS) {
    if (!data.gccRules[key]) missing.push(GCC_RULE_LABELS[key]);
  }
  return missing;
}

export function isHireOnboardingComplete(
  data: HireOnboardingSaveInput,
): boolean {
  return getMissingOnboardingFields(data).length === 0;
}

export function isHireOnboardingVerified(
  status: HireOnboardingStatus | null | undefined,
): boolean {
  return status === "verified";
}

export function isHireOnboardingEditable(
  status: HireOnboardingStatus,
): boolean {
  return status === "draft" || status === "rejected";
}
