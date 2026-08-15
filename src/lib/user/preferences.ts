import { z } from "zod";

/** Current Privacy Notice + Terms acknowledgment. Integer so Mongo stores a number. */
export const PLATFORM_TERMS_VERSION = 1;

export function platformTermsStorageKey(
  version: number = PLATFORM_TERMS_VERSION,
): string {
  return `blucollarz_platform_terms_${version}`;
}

/** Account-level product prefs stored on the Users document. */
export interface UserPreferencesFields {
  cookiesEnabled?: boolean;
  notificationsEnabled?: boolean;
  platformTermsVersion?: number;
  platformTermsAcceptedAt?: Date;
}

export interface UserPreferences {
  cookiesEnabled: boolean;
  notificationsEnabled: boolean;
  platformTermsAccepted: boolean;
  platformTermsVersion: number | null;
  platformTermsAcceptedAt: string | null;
}

/** Only these fields are needed for prefs — never load the full user doc. */
export const USER_PREFERENCE_PROJECTION = {
  cookiesEnabled: 1,
  notificationsEnabled: 1,
  platformTermsVersion: 1,
  platformTermsAcceptedAt: 1,
} as const;

export function asTermsVersion(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "v1") return 1;
    if (/^\d+$/.test(trimmed)) {
      const n = Number(trimmed);
      return n > 0 ? n : null;
    }
  }
  return null;
}

export function toAcceptedAtIso(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return "";
}

export function hasAcceptedPlatformTerms(
  version: unknown,
  acceptedAt: unknown,
  current: number = PLATFORM_TERMS_VERSION,
): boolean {
  return (
    asTermsVersion(version) === current &&
    toAcceptedAtIso(acceptedAt).length > 0
  );
}

/** Analytics cookies default off; notifications default on. */
export function toUserPreferences(
  doc: UserPreferencesFields | null | undefined,
): UserPreferences {
  const version = asTermsVersion(doc?.platformTermsVersion);
  const acceptedAt = toAcceptedAtIso(doc?.platformTermsAcceptedAt);
  return {
    cookiesEnabled: doc?.cookiesEnabled === true,
    notificationsEnabled: doc?.notificationsEnabled !== false,
    platformTermsAccepted: hasAcceptedPlatformTerms(version, acceptedAt),
    platformTermsVersion: version,
    platformTermsAcceptedAt: acceptedAt || null,
  };
}

export const userPreferencesUpdateSchema = z
  .object({
    cookiesEnabled: z.boolean().optional(),
    notificationsEnabled: z.boolean().optional(),
    platformTermsAccepted: z.literal(true).optional(),
  })
  .refine(
    (value) =>
      value.cookiesEnabled !== undefined ||
      value.notificationsEnabled !== undefined ||
      value.platformTermsAccepted === true,
    { message: "At least one preference is required" },
  );

export type UserPreferencesUpdate = z.infer<typeof userPreferencesUpdateSchema>;
