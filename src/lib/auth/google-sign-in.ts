"use client";

import { authClient } from "@/lib/auth/auth-client";
import { isNativeApp } from "@/lib/native/platform";

/** Recruiter/admin Google OAuth. Candidates sign in with DigiLocker. */
export async function signInWithGoogle() {
  await authClient.signIn.social({
    provider: "google",
    callbackURL: "/",
    errorCallbackURL: isNativeApp()
      ? "/auth?corporate=denied"
      : "/?corporate=denied",
  });
}
