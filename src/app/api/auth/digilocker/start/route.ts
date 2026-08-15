import { type NextRequest, NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth/session";
import { isCandidateOnboardingDone } from "@/lib/candidate/queries";
import {
  DIGILOCKER_REQUIRED_PURPOSES,
  hasGrantedPurposes,
} from "@/lib/compliance/consent";
import { ensureIndexes } from "@/lib/db/indexes";
import {
  buildAuthorizeUrl,
  cookieOptions,
  createCodeChallenge,
  createCodeVerifier,
  createOAuthState,
  DIGILOCKER_OAUTH_COOKIE,
  OAUTH_MAX_AGE_SEC,
  sealOAuthCookie,
} from "@/lib/kyc/digilocker";

/** Redirects to DigiLocker MeriPehchaan authorize. */
export async function GET(req: NextRequest) {
  const auth = await requireProfile("work");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (!auth.user.id) {
    return NextResponse.json({ error: "Invalid user" }, { status: 400 });
  }

  try {
    await ensureIndexes();
    if (!(await isCandidateOnboardingDone(auth.user.id))) {
      return NextResponse.redirect(
        new URL("/candidate/onboarding", req.nextUrl.origin),
      );
    }

    const consented = await hasGrantedPurposes(
      auth.user.id,
      DIGILOCKER_REQUIRED_PURPOSES,
    );
    if (!consented) {
      return NextResponse.redirect(
        new URL("/candidate/kyc?consent=required", req.nextUrl.origin),
      );
    }

    const returnTo = "/candidate/kyc";

    const state = createOAuthState();
    const codeVerifier = createCodeVerifier();
    const authorizeUrl = buildAuthorizeUrl({
      state,
      codeChallenge: createCodeChallenge(codeVerifier),
    });

    const response = NextResponse.redirect(authorizeUrl);
    response.cookies.set(
      DIGILOCKER_OAUTH_COOKIE,
      sealOAuthCookie({
        state,
        codeVerifier,
        userId: auth.user.id,
        returnTo,
        createdAt: Date.now(),
      }),
      cookieOptions(OAUTH_MAX_AGE_SEC),
    );
    return response;
  } catch (error) {
    console.error("GET /api/auth/digilocker/start:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not start DigiLocker KYC",
      },
      { status: 500 },
    );
  }
}
