/**
 * Grievance Officer / Data Protection contact — env-driven for ops scale.
 * Fill via env; never invent a person in code.
 */

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

export function getGrievanceOfficer(): GrievanceOfficerPublic {
  const name = process.env.DPDP_GRIEVANCE_OFFICER_NAME?.trim();
  const email =
    process.env.DPDP_GRIEVANCE_OFFICER_EMAIL?.trim() ||
    "support@blucollarz.com";
  const phone = process.env.DPDP_GRIEVANCE_OFFICER_PHONE?.trim();
  const postalAddress =
    process.env.DPDP_GRIEVANCE_OFFICER_ADDRESS?.trim() || "";
  const languages = (
    process.env.DPDP_GRIEVANCE_OFFICER_LANGUAGES || "Hindi,English"
  )
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
