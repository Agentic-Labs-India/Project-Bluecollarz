"use client";

import { authClient } from "@/lib/auth/auth-client";
import { isNativeApp } from "@/lib/native/platform";

/** Start Google OAuth. New accounts are always created as Candidate (`work`). */
export async function signInWithGoogle() {
  await authClient.signIn.social({
    provider: "google",
    callbackURL: "/candidate/onboarding",
    errorCallbackURL: isNativeApp() ? "/auth" : "/",
  });
}
