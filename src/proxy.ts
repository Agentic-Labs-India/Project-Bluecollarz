import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";
import { PROFILE_BASE_ROUTES } from "@/lib/core/routes";
import {
  getProfileBasePath,
  getProfileHomePath,
  normalizeProfileType,
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
  "/api/blob(.*)",
  "/api/recruiter-inquiries",
  "/",
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
  PROFILE_BASE_ROUTES.map((route) => route + "(.*)"),
);

const isCandidatePreAppAllowed = createRouteMatcher([
  "/candidate/onboarding",
  "/candidate/kyc",
  "/candidate/settings",
  "/api/(.*)",
]);

const isHirePreAppAllowed = createRouteMatcher([
  "/hire/onboarding",
  "/hire/settings",
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

async function getCandidateGate(req: NextRequest): Promise<{
  complete: boolean;
  kycVerified: boolean;
}> {
  try {
    const origin = req.nextUrl.origin;
    const res = await fetch(`${origin}/api/candidate/onboarding-status`, {
      headers: { cookie: req.headers.get("cookie") || "" },
    });
    if (!res.ok) return { complete: false, kycVerified: false };
    const data = (await res.json()) as {
      complete?: boolean;
      kycVerified?: boolean;
    };
    return {
      complete: Boolean(data.complete),
      kycVerified: Boolean(data.kycVerified),
    };
  } catch {
    return { complete: false, kycVerified: false };
  }
}

async function getHireGate(req: NextRequest): Promise<{ complete: boolean }> {
  try {
    const origin = req.nextUrl.origin;
    const res = await fetch(`${origin}/api/hire/onboarding-status`, {
      headers: { cookie: req.headers.get("cookie") || "" },
    });
    if (!res.ok) return { complete: false };
    const data = (await res.json()) as { complete?: boolean };
    return { complete: Boolean(data.complete) };
  } catch {
    return { complete: false };
  }
}

function isPathAllowedForProfile(pathname: string, profileType: ProfileType) {
  const prefix = getProfileBasePath(profileType);
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
      const { complete, kycVerified } = await getCandidateGate(req);
      const next = !complete
        ? "/candidate/onboarding"
        : !kycVerified
          ? "/candidate/kyc"
          : "/candidate/home";
      return NextResponse.redirect(new URL(next, req.url));
    }
    if (profileType === "hire") {
      const { complete } = await getHireGate(req);
      return NextResponse.redirect(
        new URL(complete ? "/hire/roles" : "/hire/onboarding", req.url),
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

      const profileType = normalizeProfileType(user.profileType ?? undefined);

      // Each profile type stays in its own app area.
      if (!isPathAllowedForProfile(pathname, profileType)) {
        return NextResponse.redirect(
          new URL(getProfileHomePath(profileType), req.url),
        );
      }

      // Work candidates: onboarding, then DigiLocker KYC, then the app.
      if (
        profileType === "work" &&
        pathname.startsWith("/candidate") &&
        !isCandidatePreAppAllowed(req)
      ) {
        const { complete, kycVerified } = await getCandidateGate(req);
        if (!complete) {
          return NextResponse.redirect(
            new URL("/candidate/onboarding", req.url),
          );
        }
        if (!kycVerified) {
          return NextResponse.redirect(new URL("/candidate/kyc", req.url));
        }
      }

      if (profileType === "hire" && pathname.startsWith("/hire")) {
        const { complete } = await getHireGate(req);
        if (!complete && !isHirePreAppAllowed(req)) {
          return NextResponse.redirect(new URL("/hire/onboarding", req.url));
        }
        if (complete && pathname.startsWith("/hire/onboarding")) {
          return NextResponse.redirect(new URL("/hire/roles", req.url));
        }
      }
    } catch {
      return clearSessionAndRedirect(req, "/");
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
