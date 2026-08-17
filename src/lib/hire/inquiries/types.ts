import { z } from "zod";
import { COMPANY_SIZES, type CompanySize } from "@/lib/hire/profile";

export const RECRUITER_INQUIRY_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const;
export type RecruiterInquiryStatus =
  (typeof RECRUITER_INQUIRY_STATUSES)[number];

/** Industry options for the public request form. */
export const RECRUITER_INDUSTRIES = [
  "Construction",
  "Facilities / Soft services",
  "Logistics & warehousing",
  "Manufacturing",
  "Hospitality",
  "Healthcare",
  "Retail",
  "Oil & gas / Energy",
  "Agriculture",
  "Security services",
  "Staffing / Workforce agency",
  "Other",
] as const;
export type RecruiterIndustry = (typeof RECRUITER_INDUSTRIES)[number];

export { COMPANY_SIZES };
export type { CompanySize };

export const recruiterInquiryCreateSchema = z.object({
  contactName: z.string().trim().min(2, "Name is required").max(120),
  companyName: z.string().trim().min(2, "Company name is required").max(160),
  email: z.string().trim().email("Valid work email required").max(200),
  phoneCountryCode: z.number().int().positive(),
  phoneNumber: z.number().int().positive(),
  industry: z.enum(RECRUITER_INDUSTRIES),
  country: z.string().trim().min(2, "Country is required").max(80),
  companySize: z.enum(COMPANY_SIZES),
  website: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => v || ""),
  about: z
    .string()
    .trim()
    .min(20, "Tell us a bit about your company")
    .max(2000),
});

export type RecruiterInquiryCreateInput = z.infer<
  typeof recruiterInquiryCreateSchema
>;

export interface RecruiterInquiryListItem {
  id: string;
  contactName: string;
  companyName: string;
  email: string;
  phoneCountryCode: number;
  phoneNumber: number;
  industry: string;
  country: string;
  companySize: string;
  website: string;
  about: string;
  status: RecruiterInquiryStatus;
  adminNote: string;
  reviewedAt: string | null;
  reviewedByEmail: string | null;
  createdAt: string;
  updatedAt: string;
}
