import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { actionFail, type ActionFailure } from "@/lib/core/action";
import {
  getProfileHomePath,
  parseProfileType,
  type ProfileType,
} from "@/lib/user/profile-types";

export interface AuthContext {
  id: string;
  /** Hire/admin Google email. Empty for candidates. */
  email: string;
  digilockerId: string | null;
  headline: string | null;
  name: string | null;
  profileType: ProfileType;
}

/** Who did the action. Join Users by `id` — never copy email/DigiLocker id onto other collections. */
export type ActorRef = { id: string };

export function toActorRef(user: { id: string }): ActorRef {
  return { id: user.id };
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
  const digest = Reflect.get(error, "digest");
  if (
    digest === "HANGING_PROMISE_REJECTION" ||
    digest === "NEXT_PRERENDER_INTERRUPTED"
  ) {
    throw error;
  }
}

export function guardToActionFail(
  guard: Extract<Guard, { ok: false }>,
): ActionFailure {
  return actionFail(guard.error, guard.code);
}

/** Resolve the signed-in user (id, email, profileType) from the session. */
export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user?.id) return null;
  const profileType = parseProfileType(user.profileType);
  if (!profileType) return null;
  const digilockerId =
    typeof user.digilockerId === "string" ? user.digilockerId.trim() || null : null;
  return {
    id: user.id,
    email: profileType === "work" ? "" : (user.email ?? "").trim(),
    digilockerId,
    headline:
      typeof user.headline === "string" ? user.headline.trim() || null : null,
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

/** Layouts and pages — redirect instead of returning an HTTP error. */
export async function requirePageUser(): Promise<AuthContext> {
  const user = await getAuthContext();
  if (!user) redirect("/");
  return user;
}

export async function requirePageProfile(
  profile: ProfileType,
): Promise<AuthContext> {
  const user = await requirePageUser();
  if (user.profileType !== profile) {
    redirect(getProfileHomePath(user.profileType));
  }
  return user;
}
