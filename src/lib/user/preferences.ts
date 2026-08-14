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

/** Analytics cookies default off; notifications default on. */
export function toUserPreferences(
  doc: UserPreferencesFields | null | undefined,
): UserPreferences {
  return {
    cookiesEnabled: doc?.cookiesEnabled === true,
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
