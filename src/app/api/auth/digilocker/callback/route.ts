import { type NextRequest, NextResponse } from "next/server";
import { isCandidateOnboardingDone } from "@/lib/candidate/queries";
import {
  DIGILOCKER_REQUIRED_PURPOSES,
  hasGrantedPurposes,
} from "@/lib/compliance/consent";
import { parseDateOnly } from "@/lib/core/dates";
import client, { COLLECTIONS, DB_NAME, matchId } from "@/lib/db";
import { ensureIndexes } from "@/lib/db/indexes";
import {
  digilockerProfileSet,
  identityMismatches,
  type UserKyc,
} from "@/lib/kyc";
import {
  cookieOptions,
  DIGILOCKER_OAUTH_COOKIE,
  exchangeAuthorizationCode,
  gatherDigilockerKyc,
  openOAuthCookie,
} from "@/lib/kyc/digilocker";

function appOrigin(req: NextRequest) {
  return (
    process.env.BETTER_AUTH_URL?.trim().replace(/\/$/, "") || req.nextUrl.origin
  );
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
 * DigiLocker callback → match identity to this profile → set isKycVerified.
 */
export async function GET(req: NextRequest) {
  const oauth = openOAuthCookie(
    req.cookies.get(DIGILOCKER_OAUTH_COOKIE)?.value,
  );
  const returnTo = oauth?.returnTo || "/candidate/kyc";

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
    if (!(await isCandidateOnboardingDone(oauth.userId))) {
      return redirectWithError(
        req,
        "/candidate/onboarding",
        "Finish onboarding before DigiLocker KYC.",
      );
    }

    const consentOk = await hasGrantedPurposes(
      oauth.userId,
      DIGILOCKER_REQUIRED_PURPOSES,
    );
    if (!consentOk) {
      return redirectWithError(
        req,
        returnTo,
        "Turn on every permission, then Agree and Verify, before DigiLocker.",
      );
    }

    const token = await exchangeAuthorizationCode({
      code,
      codeVerifier: oauth.codeVerifier,
    });
    const verifiedAt = new Date();
    const payload = await gatherDigilockerKyc({
      accessToken: token.access_token,
      idToken: token.id_token,
      tokenEaadhaar: token.eaadhaar,
    });

    await ensureIndexes();
    const filter = { _id: matchId(oauth.userId) as never };
    const existing = await client
      .db(DB_NAME)
      .collection(COLLECTIONS.USERS_COLLECTION)
      .findOne(filter, {
        projection: {
          phoneNumber: 1,
          dateOfBirth: 1,
          kyc: 1,
        },
      });

    const existingKyc = (existing?.kyc as UserKyc | undefined) ?? null;
    const mismatches = identityMismatches(
      {
        phoneNumber:
          typeof existing?.phoneNumber === "number"
            ? existing.phoneNumber
            : null,
        dateOfBirth: parseDateOnly(existing?.dateOfBirth),
        pan: existingKyc?.pan ?? null,
        aadhaarLast4: existingKyc?.aadhaarLast4 ?? null,
        gender: existingKyc?.gender ?? null,
      },
      payload,
    );
    if (mismatches.length) {
      return redirectWithError(req, returnTo, mismatches.join(" "));
    }

    let profileUpdate: ReturnType<typeof digilockerProfileSet>;
    try {
      profileUpdate = digilockerProfileSet(payload, verifiedAt);
    } catch (ageError) {
      return redirectWithError(
        req,
        returnTo,
        ageError instanceof Error
          ? ageError.message
          : "Could not complete DigiLocker verification.",
      );
    }
    const { $set } = profileUpdate;
    await client
      .db(DB_NAME)
      .collection(COLLECTIONS.USERS_COLLECTION)
      .updateOne(filter, { $set });

    const successUrl = new URL(returnTo, appOrigin(req));
    successUrl.searchParams.set("digilocker", "success");
    successUrl.searchParams.delete("message");

    const res = NextResponse.redirect(successUrl);
    res.cookies.set(DIGILOCKER_OAUTH_COOKIE, "", {
      ...cookieOptions(0),
      maxAge: 0,
    });
    return res;
  } catch (error) {
    console.error("GET /api/auth/digilocker/callback:", error);
    return redirectWithError(
      req,
      returnTo,
      error instanceof Error
        ? error.message
        : "DigiLocker KYC failed. Please try again.",
    );
  }
}
