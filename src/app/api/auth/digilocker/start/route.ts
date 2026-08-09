import { NextRequest, NextResponse } from "next/server";
import { requireProfile } from "@/lib/api/session";
import { isId } from "@/lib/db";
import {
  buildAuthorizeUrl,
  cookieOptions,
  createCodeChallenge,
  createCodeVerifier,
  createOAuthState,
  DIGILOCKER_OAUTH_COOKIE,
  OAUTH_MAX_AGE_SEC,
  sealOAuthCookie,
} from "@/lib/digilocker";

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
    const jobId = req.nextUrl.searchParams.get("jobId");
    const returnTo =
      typeof jobId === "string" && isId(jobId)
        ? `/candidate/kyc?jobId=${jobId}`
        : "/candidate/kyc";

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
