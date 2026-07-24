export type ProfileType = "work" | "hire" | "admin";

export const PROFILE_TYPES = ["work", "hire", "admin"] as const satisfies readonly ProfileType[];

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

export function getProfileIdLabel(
  profileType: string | null | undefined,
): string {
  return PROFILE_ID_LABELS[normalizeProfileType(profileType)];
}

export function normalizeProfileType(
  value: string | null | undefined,
): ProfileType {
  const normalized = value?.toLowerCase().trim();
  if (normalized === "hire" || normalized === "work" || normalized === "admin") {
    return normalized;
  }
  return DEFAULT_PROFILE_TYPE;
}

export function getProfileBasePath(
  profileType: string | null | undefined,
): string {
  return PROFILE_BASES[normalizeProfileType(profileType)];
}

export function getProfileHomePath(
  profileType: string | null | undefined,
): string {
  return PROFILE_HOMES[normalizeProfileType(profileType)];
}
