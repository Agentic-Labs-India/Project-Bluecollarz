import { type NextRequest, NextResponse } from "next/server";
import { upsertCandidateFromDigilocker } from "@/lib/auth/digilocker-account";
import { attachAuthSession } from "@/lib/auth/session-cookie";
import {
  cookieOptions,
  DIGILOCKER_OAUTH_COOKIE,
  exchangeAuthorizationCode,
  gatherDigilockerKyc,
  openOAuthCookie,
  requestOrigin,
} from "@/lib/kyc/digilocker";
import { isNativeUserAgent } from "@/lib/native/platform";

function appOrigin(req: NextRequest) {
  return requestOrigin(req.headers, req.nextUrl.origin);
}

function loginHome(req: NextRequest) {
  return isNativeUserAgent(req.headers.get("user-agent")) ? "/auth" : "/";
}

function redirectWithError(req: NextRequest, returnTo: string, error: string) {
  const url = new URL(returnTo, appOrigin(req));
  url.searchParams.set("digilocker", "error");
  url.searchParams.set("message", error.slice(0, 220));
  const res = NextResponse.redirect(url);
  res.cookies.set(DIGILOCKER_OAUTH_COOKIE, "", {
    ...cookieOptions(0),
    maxAge: 0,
  });
  return res;
}

/**
 * DigiLocker callback → candidate login/signup + KYC, or reverify an existing work profile.
 */
export async function GET(req: NextRequest) {
  const oauth = openOAuthCookie(
    req.cookies.get(DIGILOCKER_OAUTH_COOKIE)?.value,
  );
  const returnTo = oauth?.returnTo || loginHome(req);

  const error = req.nextUrl.searchParams.get("error");
  if (error) {
    return redirectWithError(
      req,
      returnTo,
      req.nextUrl.searchParams.get("error_description") ||
        "DigiLocker authorization was denied.",
    );
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!code || !state || !oauth || state !== oauth.state) {
    return redirectWithError(
      req,
      returnTo,
      "Invalid DigiLocker callback (state mismatch or missing code).",
    );
  }

  try {
    const token = await exchangeAuthorizationCode({
      code,
      codeVerifier: oauth.codeVerifier,
      redirectUri: oauth.redirectUri,
    });
    const verifiedAt = new Date();
    const payload = await gatherDigilockerKyc({
      accessToken: token.access_token,
      idToken: token.id_token,
      tokenEaadhaar: token.eaadhaar,
    });

    const { userId } = await upsertCandidateFromDigilocker({
      payload,
      verifiedAt,
      sessionUserId: oauth.intent === "reverify" ? oauth.userId : undefined,
    });

    const successTo =
      oauth.intent === "reverify" ? "/candidate/kyc" : loginHome(req);
    const successUrl = new URL(successTo, appOrigin(req));
    if (oauth.intent === "reverify") {
      successUrl.searchParams.set("digilocker", "success");
      successUrl.searchParams.delete("message");
    }

    const res = NextResponse.redirect(successUrl);
    res.cookies.set(DIGILOCKER_OAUTH_COOKIE, "", {
      ...cookieOptions(0),
      maxAge: 0,
    });
    await attachAuthSession(res, userId);
    return res;
  } catch (error) {
    console.error("GET /api/auth/digilocker/callback:", error);
    return redirectWithError(
      req,
      returnTo,
      error instanceof Error
        ? error.message
        : "DigiLocker sign-in failed. Please try again.",
    );
  }
}
