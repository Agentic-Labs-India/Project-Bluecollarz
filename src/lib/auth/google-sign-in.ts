"use client";

import { authClient } from "@/lib/auth/auth-client";
import { getProfileHomePath, type ProfileType } from "@/lib/profile-types";

/** Start Google OAuth for the given profile type (Candidate, Recruiter, RA). */
export async function signInWithGoogle(profileType: ProfileType) {
  await authClient.signIn.social({
    provider: "google",
    // Work accounts land on onboarding; the page sends complete profiles to home.
    callbackURL:
      profileType === "work"
        ? "/candidate/onboarding"
        : getProfileHomePath(profileType),
    errorCallbackURL: "/",
    additionalData: { profileType },
  });
}
