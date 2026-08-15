/**
 * Grievance Officer / person able to answer questions about processing
 * (DPDP Rules, 2025 — Rule 9). Admin Settings is the source of truth;
 * env is fallback until saved.
 */

import { getPlatformSettings } from "@/lib/admin/platform-settings";
import {
  RIGHTS_ACKNOWLEDGE_HOURS,
  RIGHTS_RESOLVE_DAYS,
} from "@/lib/compliance/timelines";

export const DPDP_DESK_NAME =
  "Grievance desk, Blucollarz Technologies Private Limited";
export const DPDP_DESK_EMAIL = "support@blucollarz.com";
export const DPDP_DESK_ADDRESS = "Hyderabad, Telangana, India";

export interface GrievanceOfficerPublic {
  role: string;
  name: string;
  email: string;
  phone: string;
  postalAddress: string;
  languages: string[];
  acknowledgeHours: number;
  resolveDays: number;
  owrcHelpline: string;
}

export function toGrievanceContactPayload(go: GrievanceOfficerPublic) {
  return {
    role: go.role,
    name: go.name,
    email: go.email,
    phone: go.phone || null,
    postalAddress: go.postalAddress,
    languages: go.languages,
    acknowledgeHours: go.acknowledgeHours,
    resolveDays: go.resolveDays,
    grievanceUrl: "/grievance",
    privacyUrl: "/privacy",
  };
}

export async function getGrievanceOfficer(): Promise<GrievanceOfficerPublic> {
  const settings = await getPlatformSettings();
  const g = settings.grievanceOfficer;
  const name = g.name.trim();
  const email = g.email.trim() || DPDP_DESK_EMAIL;
  const phone = g.phone.trim();
  const postalAddress = g.address.trim() || DPDP_DESK_ADDRESS;
  const languages = g.languages.map((s) => s.trim()).filter(Boolean);

  return {
    role: "Person able to answer questions about personal data processing",
    name: name || DPDP_DESK_NAME,
    email,
    phone,
    postalAddress,
    languages: languages.length ? languages : ["Hindi", "English"],
    acknowledgeHours: RIGHTS_ACKNOWLEDGE_HOURS,
    resolveDays: RIGHTS_RESOLVE_DAYS,
    owrcHelpline: "1800 11 3090",
  };
}
