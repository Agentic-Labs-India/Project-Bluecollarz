import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { ADMIN_EMAIL, PROFILE_BASE_ROUTES } from "@/lib/routes";
import {
  getProfileHomePath,
  normalizeProfileType,
  type ProfileType,
} from "@/lib/profile-types";

const createRouteMatcher = (patterns: string[]) => {
  const regexes = patterns.map((pattern) => {
    const regexPattern = pattern
      .replace(/\(\.\*\)/g, ".*")
      .replace(/:[a-zA-Z0-9_]+/g, "[^/]+");
    return new RegExp(`^${regexPattern}$`);
  });

  return (req: NextRequest) => {
    return regexes.some((regex) => regex.test(req.nextUrl.pathname));
  };
};

const isPublicRoute = createRouteMatcher([
  "/api/auth(.*)",
  "/api/blob(.*)",
  "/",
  "/about",
  "/mission",
  "/vision",
  "/for-recruiters",
  "/login",
  "/contact",
  "/privacy",
  "/terms",
]);

const isProtectedRoute = createRouteMatcher(
  PROFILE_BASE_ROUTES.map((route) => route + "(.*)"),
);

const isCandidateOnboardingAllowed = createRouteMatcher([
  "/candidate/onboarding",
  "/candidate/settings",
  "/api/(.*)",
]);

type SessionUser = {
  id?: string | null;
  email?: string | null;
  profileType?: string | null;
};

async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  try {
    const origin = req.nextUrl.origin;
    const res = await fetch(`${origin}/api/auth/get-session`, {
      headers: { cookie: req.headers.get("cookie") || "" },
    });

    if (res.ok) {
      const data = await res.json();
      return data?.user ?? null;
    }
  } catch (error) {
    console.error("Middleware session lookup failed:", error);
  }
  return null;
}

async function isCandidateComplete(req: NextRequest): Promise<boolean> {
  try {
    const origin = req.nextUrl.origin;
    const res = await fetch(`${origin}/api/candidate/onboarding-status`, {
      headers: { cookie: req.headers.get("cookie") || "" },
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { complete?: boolean };
    return Boolean(data.complete);
  } catch {
    return false;
  }
}

function profileRoutePrefix(profileType: ProfileType): string {
  if (profileType === "hire") return "/hire";
  return "/candidate";
}

function isPathAllowedForProfile(pathname: string, profileType: ProfileType) {
  const prefix = profileRoutePrefix(profileType);
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function clearSessionAndRedirect(req: NextRequest, to: string) {
  const res = NextResponse.redirect(new URL(to, req.url));
  for (const name of [
    "better-auth.session_token",
    "__Secure-better-auth.session_token",
  ]) {
    res.cookies.set(name, "", { path: "/", maxAge: 0 });
  }
  return res;
}

function nextWithPathname(req: NextRequest) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", req.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export async function proxy(req: NextRequest) {
  const sessionCookie = getSessionCookie(req);
  const pathname = req.nextUrl.pathname;

  if (!isPublicRoute(req)) {
    if (!sessionCookie) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  if (pathname === "/" && sessionCookie) {
    const user = await getSessionUser(req);
    if (!user?.email) {
      return clearSessionAndRedirect(req, "/");
    }
    const profileType = normalizeProfileType(user.profileType ?? undefined);
    if (profileType === "work") {
      const complete = await isCandidateComplete(req);
      return NextResponse.redirect(
        new URL(complete ? "/candidate/home" : "/candidate/onboarding", req.url),
      );
    }
    return NextResponse.redirect(
      new URL(getProfileHomePath(profileType), req.url),
    );
  }

  if (isProtectedRoute(req) && sessionCookie) {
    try {
      const user = await getSessionUser(req);
      if (!user?.email) {
        return clearSessionAndRedirect(req, "/");
      }

      const normalizedEmail = user.email.toLowerCase().trim();
      const isAdmin = normalizedEmail === ADMIN_EMAIL.toLowerCase();
      const profileType = normalizeProfileType(user.profileType ?? undefined);

      // Admins may browse any area; everyone else stays in their profile app.
      if (!isAdmin && !isPathAllowedForProfile(pathname, profileType)) {
        return NextResponse.redirect(
          new URL(getProfileHomePath(profileType), req.url),
        );
      }

      // Work candidates (including admin testing as work) must finish onboarding.
      if (
        profileType === "work" &&
        pathname.startsWith("/candidate") &&
        !isCandidateOnboardingAllowed(req)
      ) {
        const complete = await isCandidateComplete(req);
        if (!complete) {
          return NextResponse.redirect(
            new URL("/candidate/onboarding", req.url),
          );
        }
      }
    } catch {
      return clearSessionAndRedirect(req, "/");
    }
  }

  return nextWithPathname(req);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
