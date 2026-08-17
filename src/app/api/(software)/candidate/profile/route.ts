import { type NextRequest, NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth/session";
import {
  type CandidateProfileFields,
  type CandidateProfileUpdateInput,
  candidateProfileUpdateSchema,
  candidateUpdateToMongo,
  formatCandidateProfileError,
  isCandidateProfileComplete,
  isUnderageZodError,
  sanitizeGeoProfileFields,
  toCandidateProfileData,
  UNDERAGE_ERROR_CODE,
  UNDERAGE_MESSAGE,
} from "@/lib/candidate/profile";
import { formatDateOnly, parseDateOnly } from "@/lib/core/dates";
import client, { COLLECTIONS, DB_NAME, matchId } from "@/lib/db";
import { ensureIndexes } from "@/lib/db/indexes";
import { isIdentityVerified } from "@/lib/kyc";

type UserDoc = CandidateProfileFields & {
  _id: unknown;
  name?: string;
  email?: string;
  image?: string;
};

/** When DigiLocker-verified, ignore client edits to locked identity fields. */
function lockIdentityFields(
  data: CandidateProfileUpdateInput,
  existing: UserDoc | null,
): CandidateProfileUpdateInput {
  if (!isIdentityVerified(existing)) return data;
  return {
    ...data,
    phoneNumber: existing?.phoneNumber ?? data.phoneNumber,
    phoneCountryCode: existing?.phoneCountryCode ?? data.phoneCountryCode,
    dateOfBirth: existing?.dateOfBirth
      ? formatDateOnly(existing.dateOfBirth) || data.dateOfBirth
      : data.dateOfBirth,
    location: existing?.location ?? data.location,
    residenceCountry: existing?.residenceCountry ?? data.residenceCountry,
    residenceState: existing?.residenceState ?? data.residenceState,
    residenceCity: existing?.residenceCity ?? data.residenceCity,
    residencePostalCode:
      existing?.residencePostalCode ?? data.residencePostalCode,
  };
}

export async function GET() {
  // Auth must stay outside try/catch so prerender aborts aren't logged as 500s.
  const auth = await requireProfile("work");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    await ensureIndexes();
    const db = client.db(DB_NAME);
    const user = await db
      .collection<UserDoc>(COLLECTIONS.USERS_COLLECTION)
      .findOne({ _id: matchId(auth.user.id) as never });

    const profile = toCandidateProfileData(user);
    return NextResponse.json({
      profile,
      complete: isCandidateProfileComplete(profile),
    });
  } catch (error) {
    console.error("GET /api/candidate/profile:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await ensureIndexes();
    const auth = await requireProfile("work");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => null);
    const parsed = candidateProfileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      if (isUnderageZodError(parsed.error)) {
        return NextResponse.json(
          {
            error: UNDERAGE_MESSAGE,
            code: UNDERAGE_ERROR_CODE,
            underage: true,
          },
          { status: 403 },
        );
      }
      return NextResponse.json(
        { error: formatCandidateProfileError(parsed.error) },
        { status: 400 },
      );
    }

    const db = client.db(DB_NAME);
    const filter = { _id: matchId(auth.user.id) as never };
    const existing = await db
      .collection<UserDoc>(COLLECTIONS.USERS_COLLECTION)
      .findOne(filter);
    const data = sanitizeGeoProfileFields(
      lockIdentityFields(parsed.data, existing),
    );

    const merged = toCandidateProfileData({
      ...existing,
      ...data,
      yearsExperience: data.yearsExperience,
      fullTimeCompensation: data.fullTimeCompensation,
      partTimeCompensation: data.partTimeCompensation,
      dateOfBirth: parseDateOnly(data.dateOfBirth),
      education: data.education,
      workExperience: data.workExperience,
      otherLinks: data.otherLinks,
      languages: data.languages,
      voiceLanguage: data.voiceLanguage || undefined,
      hobbies: data.hobbies,
      preferredCountries: data.preferredCountries,
    });
    const complete = isCandidateProfileComplete(merged);
    // Only the voice onboarding agent may flip this from false → true.
    if (!existing?.candidateOnboardingComplete && complete) {
      return NextResponse.json(
        {
          error: "Finish onboarding with the voice assistant first.",
          code: "ONBOARDING_REQUIRED",
        },
        { status: 403 },
      );
    }
    const { $set, $unset } = candidateUpdateToMongo(
      data,
      Boolean(existing?.candidateOnboardingComplete) && complete,
    );
    const user = await db
      .collection<UserDoc>(COLLECTIONS.USERS_COLLECTION)
      .findOneAndUpdate(
        filter,
        Object.keys($unset).length ? { $set, $unset } : { $set },
        { returnDocument: "after" },
      );
    const profile = toCandidateProfileData(user);
    return NextResponse.json({
      profile,
      complete: isCandidateProfileComplete(profile),
    });
  } catch (error) {
    console.error("PUT /api/candidate/profile:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
