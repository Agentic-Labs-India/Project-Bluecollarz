import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getCandidateGateStatus } from "@/lib/candidate/queries";
import { PROFILE_BASE_ROUTES } from "@/lib/core/routes";
import { getHireOnboardingStatus } from "@/lib/hire/onboarding";
import { isHireOnboardingVerified } from "@/lib/hire/onboarding/types";
import { isNativeUserAgent } from "@/lib/native/platform";
import {
  getProfileBasePath,
  getProfileHomePath,
  parseProfileType,
  type ProfileType,
} from "@/lib/user/profile-types";

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
  "/api/blob/file",
  "/",
  "/auth",
  "/about",
  "/mission",
  "/vision",
  "/for-recruiters",
  "/contact",
  "/privacy",
  "/terms",
  "/grievance",
  "/blog",
  "/blog(.*)",
  "/jobs(.*)",
  "/sitemap.xml",
  "/robots.txt",
]);

const isProtectedRoute = createRouteMatcher(
  PROFILE_BASE_ROUTES.map((route) => `${route}(.*)`),
);

const isCandidatePreAppAllowed = createRouteMatcher([
  "/candidate/onboarding",
  "/candidate/kyc",
  "/candidate/settings",
]);

const isHirePreAppAllowed = createRouteMatcher([
  "/hire/onboarding",
  "/hire/settings",
]);

async function getSessionUser(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  return session?.user ?? null;
}

function isPathAllowedForProfile(pathname: string, profileType: ProfileType) {
  const prefix = getProfileBasePath(profileType);
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isNativeRequest(req: NextRequest): boolean {
  return isNativeUserAgent(req.headers.get("user-agent"));
}

function signInPath(req: NextRequest): string {
  return isNativeRequest(req) ? "/auth" : "/";
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

export async function proxy(req: NextRequest) {
  const sessionCookie = getSessionCookie(req);
  const pathname = req.nextUrl.pathname;
  const native = isNativeRequest(req);
  const signIn = signInPath(req);

  if (pathname === "/auth" && !native) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (!isPublicRoute(req) && !sessionCookie) {
    return pathname.startsWith("/api/")
      ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      : NextResponse.redirect(new URL(signIn, req.url));
  }

  if (pathname === "/" && native && !sessionCookie) {
    return NextResponse.redirect(new URL("/auth", req.url));
  }

  if ((pathname === "/" || pathname === "/auth") && sessionCookie) {
    const user = await getSessionUser(req);
    if (!user?.id) {
      return clearSessionAndRedirect(req, signIn);
    }
    const profileType = parseProfileType(user.profileType);
    if (!profileType) {
      return clearSessionAndRedirect(req, signIn);
    }
    if (profileType === "work") {
      const { complete, kycVerified } = await getCandidateGateStatus(user.id);
      const next = !kycVerified
        ? "/candidate/kyc"
        : !complete
          ? "/candidate/onboarding"
          : "/candidate/home";
      return NextResponse.redirect(new URL(next, req.url));
    }
    if (profileType === "hire") {
      const status = await getHireOnboardingStatus(user.id);
      return NextResponse.redirect(
        new URL(
          isHireOnboardingVerified(status) ? "/hire/roles" : "/hire/onboarding",
          req.url,
        ),
      );
    }
    return NextResponse.redirect(
      new URL(getProfileHomePath(profileType), req.url),
    );
  }

  if (isProtectedRoute(req) && sessionCookie) {
    try {
      const user = await getSessionUser(req);
      if (!user?.id) {
        return clearSessionAndRedirect(req, signIn);
      }

      const profileType = parseProfileType(user.profileType);
      if (!profileType) {
        return clearSessionAndRedirect(req, signIn);
      }

      if (!isPathAllowedForProfile(pathname, profileType)) {
        return NextResponse.redirect(
          new URL(getProfileHomePath(profileType), req.url),
        );
      }

      if (
        profileType === "work" &&
        pathname.startsWith("/candidate") &&
        !isCandidatePreAppAllowed(req)
      ) {
        const { complete, kycVerified } = await getCandidateGateStatus(user.id);
        if (!kycVerified) {
          return NextResponse.redirect(new URL("/candidate/kyc", req.url));
        }
        if (!complete) {
          return NextResponse.redirect(
            new URL("/candidate/onboarding", req.url),
          );
        }
      }

      if (profileType === "hire" && pathname.startsWith("/hire")) {
        const status = await getHireOnboardingStatus(user.id);
        const complete = isHireOnboardingVerified(status);
        if (!complete && !isHirePreAppAllowed(req)) {
          return NextResponse.redirect(new URL("/hire/onboarding", req.url));
        }
        if (complete && pathname.startsWith("/hire/onboarding")) {
          return NextResponse.redirect(new URL("/hire/roles", req.url));
        }
      }
    } catch {
      return clearSessionAndRedirect(req, signIn);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|avif|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
