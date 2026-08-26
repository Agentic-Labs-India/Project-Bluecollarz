import { type NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
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
  type DigilockerOAuthIntent,
  digilockerRedirectUri,
  OAUTH_MAX_AGE_SEC,
  sealOAuthCookie,
} from "@/lib/kyc/digilocker";
import { isNativeUserAgent } from "@/lib/native/platform";

function loginReturnTo(req: NextRequest) {
  return isNativeUserAgent(req.headers.get("user-agent")) ? "/auth" : "/";
}

/** Redirects to DigiLocker MeriPehchaan authorize (candidate login or reverify). */
export async function GET(req: NextRequest) {
  const session = await requireUser();
  const signedIn = session.ok;

  if (signedIn && session.user.profileType !== "work") {
    return NextResponse.json(
      { error: "DigiLocker is for candidates only." },
      { status: 403 },
    );
  }

  const intent: DigilockerOAuthIntent = signedIn ? "reverify" : "login";
  const returnTo = signedIn ? "/candidate/kyc" : loginReturnTo(req);

  try {
    await ensureIndexes();

    if (signedIn) {
      const consented = await hasGrantedPurposes(
        session.user.id,
        DIGILOCKER_REQUIRED_PURPOSES,
      );
      if (!consented) {
        return NextResponse.redirect(
          new URL("/candidate/kyc?consent=required", req.nextUrl.origin),
        );
      }
    }

    const state = createOAuthState();
    const codeVerifier = createCodeVerifier();
    const redirectUri = digilockerRedirectUri(req.headers, req.nextUrl.origin);
    const authorizeUrl = buildAuthorizeUrl({
      state,
      codeChallenge: createCodeChallenge(codeVerifier),
      redirectUri,
    });

    const response = NextResponse.redirect(authorizeUrl);
    response.cookies.set(
      DIGILOCKER_OAUTH_COOKIE,
      sealOAuthCookie({
        state,
        codeVerifier,
        redirectUri,
        intent,
        ...(signedIn ? { userId: session.user.id } : {}),
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
          error instanceof Error ? error.message : "Could not start DigiLocker",
      },
      { status: 500 },
    );
  }
}
