import "server-only";
import { parseSetCookieHeader } from "better-auth/cookies";
import { serializeSignedCookie } from "better-call";
import type { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";

/**
 * Attach a Better Auth session cookie to a Next.js redirect response.
 * Used after DigiLocker login — DigiLocker is not a Better Auth social provider.
 */
export async function attachAuthSession(res: NextResponse, userId: string) {
  const ctx = await auth.$context;
  const session = await ctx.internalAdapter.createSession(userId);
  if (!session?.token) {
    throw new Error("Could not create session");
  }

  const cookie = ctx.authCookies.sessionToken;
  const header = await serializeSignedCookie(
    cookie.name,
    session.token,
    ctx.secret,
    {
      ...cookie.attributes,
      maxAge: ctx.sessionConfig.expiresIn,
    },
  );
  const parsed = parseSetCookieHeader(header);
  const attrs = parsed.get(cookie.name);
  if (!attrs?.value) {
    throw new Error("Could not sign session cookie");
  }

  const sameSite = attrs.samesite?.toLowerCase();
  res.cookies.set(cookie.name, attrs.value, {
    httpOnly: attrs.httponly ?? true,
    secure: attrs.secure,
    path: attrs.path || "/",
    maxAge: attrs["max-age"],
    domain: attrs.domain,
    expires: attrs.expires,
    sameSite:
      sameSite === "strict" || sameSite === "none" || sameSite === "lax"
        ? sameSite
        : "lax",
  });
}
