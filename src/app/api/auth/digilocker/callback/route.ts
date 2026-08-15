import { NextRequest, NextResponse } from "next/server";
import client, { DB_NAME, COLLECTIONS, matchId } from "@/lib/db";
import { ensureIndexes } from "@/lib/db/indexes";
import {
  cookieOptions,
  DIGILOCKER_OAUTH_COOKIE,
  exchangeAuthorizationCode,
  gatherDigilockerKyc,
  openOAuthCookie,
} from "@/lib/kyc/digilocker";
import {
  compareIdentity,
  digilockerProfileSet,
  type UserKyc,
} from "@/lib/kyc";
import {
  DIGILOCKER_REQUIRED_PURPOSES,
  hasGrantedPurposes,
} from "@/lib/compliance/consent";

function appOrigin(req: NextRequest) {
  return (
    process.env.BETTER_AUTH_URL?.trim().replace(/\/$/, "") ||
    req.nextUrl.origin
  );
}

function redirectWithError(
  req: NextRequest,
  returnTo: string,
  error: string,
) {
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
 * DigiLocker callback → gather KYC → set isKycVerified + nested `kyc` pack.
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
    const token = await exchangeAuthorizationCode({
      code,
      codeVerifier: oauth.codeVerifier,
    });
    const verifiedAtIso = new Date().toISOString();
    const payload = await gatherDigilockerKyc({
      accessToken: token.access_token,
      idToken: token.id_token,
      tokenEaadhaar: token.eaadhaar,
      verifiedAt: verifiedAtIso,
    });

    await ensureIndexes();
    const filter = { _id: matchId(oauth.userId) as never };
    const existing = await client
      .db(DB_NAME)
      .collection(COLLECTIONS.USERS_COLLECTION)
      .findOne(filter, {
        projection: {
          name: 1,
          location: 1,
          phoneNumber: 1,
          dateOfBirth: 1,
          kyc: 1,
        },
      });

    const existingKyc = (existing?.kyc as UserKyc | undefined) ?? null;
    const mismatches = compareIdentity(
      {
        name: existing?.name ? String(existing.name) : null,
        location: existing?.location ? String(existing.location) : null,
        phoneNumber:
          typeof existing?.phoneNumber === "number"
            ? existing.phoneNumber
            : null,
        dateOfBirth: (existing?.dateOfBirth as Date | string | null) ?? null,
        pan: existingKyc?.pan ?? null,
      },
      payload,
    );
    if (mismatches.length) {
      payload.note = [payload.note, ...mismatches].filter(Boolean).join(" ");
    }

    const consentOk = await hasGrantedPurposes(
      oauth.userId,
      DIGILOCKER_REQUIRED_PURPOSES,
    );
    if (!consentOk) {
      return redirectWithError(
        req,
        returnTo,
        "Consent for identity and contact is required (or was withdrawn). Open KYC, grant consent, then try DigiLocker again.",
      );
    }

    let profileUpdate: ReturnType<typeof digilockerProfileSet>;
    try {
      profileUpdate = digilockerProfileSet(payload, new Date(verifiedAtIso));
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
