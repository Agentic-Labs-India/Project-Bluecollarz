export type ProfileType = "work" | "hire";

export const DEFAULT_PROFILE_TYPE: ProfileType = "work";

const PROFILE_HOMES: Record<ProfileType, string> = {
  work: "/candidate/home",
  hire: "/hire/roles",
};

const PROFILE_ID_LABELS: Record<ProfileType, string> = {
  work: "Candidate",
  hire: "Recruiter",
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
  if (normalized === "hire" || normalized === "work") {
    return normalized;
  }
  return DEFAULT_PROFILE_TYPE;
}

export function getProfileBasePath(
  profileType: string | null | undefined,
): string {
  return normalizeProfileType(profileType) === "hire" ? "/hire" : "/candidate";
}

export function getProfileHomePath(
  profileType: string | null | undefined,
): string {
  return PROFILE_HOMES[normalizeProfileType(profileType)];
}
