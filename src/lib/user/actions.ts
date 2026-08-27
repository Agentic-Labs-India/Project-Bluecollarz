"use server";

import { guardToActionFail, requireUser } from "@/lib/auth/session";
import { actionFail, actionOk, type ActionResult } from "@/lib/core/action";
import {
  getUserPreferences,
  saveUserPreferences,
} from "@/lib/user/preference-queries";
import type {
  UserPreferences,
  UserPreferencesUpdate,
} from "@/lib/user/preferences";

export async function getUserPreferencesAction(): Promise<
  ActionResult<{ preferences: UserPreferences }>
> {
  const auth = await requireUser();
  if (!auth.ok) return guardToActionFail(auth);
  try {
    const preferences = await getUserPreferences(auth.user.id);
    return actionOk({ preferences });
  } catch (error) {
    console.error("getUserPreferencesAction:", error);
    return actionFail("Failed to load preferences");
  }
}

export async function updateUserPreferencesAction(
  patch: UserPreferencesUpdate,
): Promise<ActionResult<{ preferences: UserPreferences }>> {
  const auth = await requireUser();
  if (!auth.ok) return guardToActionFail(auth);
  try {
    const preferences = await saveUserPreferences({
      userId: auth.user.id,
      profileType: auth.user.profileType,
      patch,
    });
    return actionOk({ preferences });
  } catch (error) {
    console.error("updateUserPreferencesAction:", error);
    return actionFail(
      error instanceof Error ? error.message : "Failed to save preferences",
    );
  }
}
