import { z } from "zod";

/** Account-level product prefs stored on the Users document. */
export interface UserPreferencesFields {
  cookiesEnabled?: boolean;
  notificationsEnabled?: boolean;
}

export interface UserPreferences {
  cookiesEnabled: boolean;
  notificationsEnabled: boolean;
}

/** Missing fields default to on. */
export function toUserPreferences(
  doc: UserPreferencesFields | null | undefined,
): UserPreferences {
  return {
    cookiesEnabled: doc?.cookiesEnabled !== false,
    notificationsEnabled: doc?.notificationsEnabled !== false,
  };
}

export const userPreferencesUpdateSchema = z
  .object({
    cookiesEnabled: z.boolean().optional(),
    notificationsEnabled: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.cookiesEnabled !== undefined ||
      value.notificationsEnabled !== undefined,
    { message: "At least one preference is required" },
  );

export type UserPreferencesUpdate = z.infer<typeof userPreferencesUpdateSchema>;
