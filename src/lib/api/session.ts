import { headers } from "next/headers";
import { connection } from "next/server";
import { auth } from "@/lib/auth/auth";
import { normalizeProfileType, type ProfileType } from "@/lib/profile-types";

interface AuthContext {
  id: string;
  email: string;
  profileType: ProfileType;
}

type Guard =
  | { ok: true; user: AuthContext }
  | { ok: false; error: string; status: number };

/** Resolve the signed-in user (id, email, profileType) from the session. */
async function getAuthContext(): Promise<AuthContext | null> {
  await connection();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as
    | { id?: string; email?: string; profileType?: string }
    | undefined;
  if (!user?.id) return null;
  return {
    id: user.id,
    email: (user.email ?? "").toLowerCase(),
    profileType: normalizeProfileType(user.profileType),
  };
}

export async function requireUser(): Promise<Guard> {
  const user = await getAuthContext();
  return user
    ? { ok: true, user }
    : { ok: false, error: "Unauthorized", status: 401 };
}

export async function requireProfile(profile: ProfileType): Promise<Guard> {
  const result = await requireUser();
  if (!result.ok) return result;
  if (result.user.profileType !== profile) {
    return { ok: false, error: `${profile} profile required`, status: 403 };
  }
  return result;
}
