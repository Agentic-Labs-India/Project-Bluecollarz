export type ProfileType = "work" | "hire" | "admin";

export const PROFILE_TYPES = [
  "work",
  "hire",
  "admin",
] as const satisfies readonly ProfileType[];

export const DEFAULT_PROFILE_TYPE: ProfileType = "work";

const PROFILE_HOMES: Record<ProfileType, string> = {
  work: "/candidate/home",
  hire: "/hire/roles",
  admin: "/admin/recruiters",
};

const PROFILE_BASES: Record<ProfileType, string> = {
  work: "/candidate",
  hire: "/hire",
  admin: "/admin",
};

const PROFILE_ID_LABELS: Record<ProfileType, string> = {
  work: "Candidate",
  hire: "Recruiter",
  admin: "Admin",
};

export function isProfileType(value: unknown): value is ProfileType {
  return value === "work" || value === "hire" || value === "admin";
}

export function parseProfileType(value: unknown): ProfileType | null {
  return isProfileType(value) ? value : null;
}

export function getProfileIdLabel(profileType: ProfileType): string {
  return PROFILE_ID_LABELS[profileType];
}

export function getProfileBasePath(profileType: ProfileType): string {
  return PROFILE_BASES[profileType];
}

export function getProfileHomePath(profileType: ProfileType): string {
  return PROFILE_HOMES[profileType];
}
