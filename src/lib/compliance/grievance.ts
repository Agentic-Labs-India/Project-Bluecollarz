/**
 * Grievance Officer / Data Protection contact.
 * Admin Settings is the source of truth; env is fallback until saved.
 */

import { getPlatformSettings } from "@/lib/admin/platform-settings";

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
  interim: boolean;
}

export async function getGrievanceOfficer(): Promise<GrievanceOfficerPublic> {
  const settings = await getPlatformSettings();
  const g = settings.grievanceOfficer;
  const name = g.name.trim();
  const email = g.email.trim() || "support@blucollarz.com";
  const phone = g.phone.trim();
  const postalAddress = g.address.trim();
  const languages = (g.languages || "Hindi,English")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const interim = !name || !phone || !postalAddress;

  return {
    role: "Grievance Officer / Data Protection contact",
    name: name || "Grievance Officer (Blucollarz) — designate TBD",
    email,
    phone: phone || "To be confirmed by counsel",
    postalAddress: postalAddress || "To be confirmed by counsel",
    languages: languages.length ? languages : ["Hindi", "English"],
    acknowledgeHours: Number(process.env.DPDP_RIGHTS_ACK_HOURS || 72),
    resolveDays: Number(process.env.DPDP_RIGHTS_RESOLVE_DAYS || 30),
    owrcHelpline: "1800 11 3090",
    interim,
  };
}
