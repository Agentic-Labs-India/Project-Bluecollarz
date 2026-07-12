"use server";

import { headers } from "next/headers";
import { auth } from "./auth";
import { normalizeProfileType, type ProfileType } from "@/lib/profile-types";

/** Profile type of the signed-in user, read straight from the session. */
export async function getSessionProfileType(): Promise<ProfileType | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  const profileType = (session?.user as { profileType?: string } | undefined)
    ?.profileType;
  return profileType ? normalizeProfileType(profileType) : null;
}
