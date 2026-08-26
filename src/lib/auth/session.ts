import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import {
  normalizeProfileType,
  type ProfileType,
} from "@/lib/user/profile-types";

export interface AuthContext {
  id: string;
  /** Hire/admin: Google email. Candidate: DigiLocker user id. */
  email: string;
  digilockerId: string | null;
  name: string | null;
  profileType: ProfileType;
}

export type Guard =
  | { ok: true; user: AuthContext }
  | { ok: false; error: string; status: number; code?: string };

/**
 * Next aborts Cache Components prerender by rejecting hanging dynamic APIs.
 * Route `try/catch` blocks must rethrow these so the route stays dynamic.
 */
export function rethrowIfPrerenderAbort(error: unknown): void {
  if (typeof error !== "object" || error === null || !("digest" in error)) {
    return;
  }
  const digest = (error as { digest?: unknown }).digest;
  if (
    digest === "HANGING_PROMISE_REJECTION" ||
    digest === "NEXT_PRERENDER_INTERRUPTED"
  ) {
    throw error;
  }
}

/** Resolve the signed-in user (id, email, profileType) from the session. */
async function getAuthContext(): Promise<AuthContext | null> {
  // `headers()` is enough to opt into request time; avoid `connection()` here —
  // API route try/catch would otherwise log HANGING_PROMISE_REJECTION during build.
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as
    | {
        id?: string;
        email?: string;
        name?: string | null;
        profileType?: string;
        digilockerId?: string | null;
      }
    | undefined;
  if (!user?.id) return null;
  const profileType = normalizeProfileType(user.profileType);
  const digilockerId = user.digilockerId?.trim() || null;
  return {
    id: user.id,
    email:
      profileType === "work"
        ? digilockerId || ""
        : (user.email ?? "").trim(),
    digilockerId,
    name: user.name?.trim() || null,
    profileType,
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
