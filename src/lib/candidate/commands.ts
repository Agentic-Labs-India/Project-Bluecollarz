import "server-only";

import {
  isTtsLanguageCode,
  parseTtsLanguage,
  type TtsLanguageCode,
} from "@/lib/ai/voice/languages";
import {
  type CandidateProfileData,
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

export class CandidateCommandError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "CandidateCommandError";
  }
}

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

export async function updateCandidateProfile(
  userId: string,
  input: unknown,
): Promise<{ profile: CandidateProfileData; complete: boolean }> {
  await ensureIndexes();
  const parsed = candidateProfileUpdateSchema.safeParse(input);
  if (!parsed.success) {
    if (isUnderageZodError(parsed.error)) {
      throw new CandidateCommandError(UNDERAGE_MESSAGE, 403, UNDERAGE_ERROR_CODE);
    }
    throw new CandidateCommandError(
      formatCandidateProfileError(parsed.error),
      400,
    );
  }

  const db = client.db(DB_NAME);
  const filter = { _id: matchId(userId) as never };
  const existing = await db
    .collection<UserDoc>(COLLECTIONS.USERS_COLLECTION)
    .findOne(filter);
  if (!existing) {
    throw new CandidateCommandError("User record missing", 404);
  }

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
  if (!existing.candidateOnboardingComplete && complete) {
    throw new CandidateCommandError(
      "Finish onboarding with the voice assistant first.",
      403,
      "ONBOARDING_REQUIRED",
    );
  }

  const { $set, $unset } = candidateUpdateToMongo(
    data,
    Boolean(existing.candidateOnboardingComplete) && complete,
  );
  const user = await db
    .collection<UserDoc>(COLLECTIONS.USERS_COLLECTION)
    .findOneAndUpdate(
      filter,
      Object.keys($unset).length ? { $set, $unset } : { $set },
      { returnDocument: "after" },
    );
  if (!user) {
    throw new CandidateCommandError("User record missing", 404);
  }
  const profile = toCandidateProfileData(user);
  return { profile, complete: isCandidateProfileComplete(profile) };
}

export async function getCandidateVoiceLanguage(
  userId: string,
): Promise<TtsLanguageCode | null> {
  await ensureIndexes();
  const db = client.db(DB_NAME);
  const user = await db
    .collection<UserDoc>(COLLECTIONS.USERS_COLLECTION)
    .findOne({ _id: matchId(userId) as never }, { projection: { voiceLanguage: 1 } });
  if (!user) {
    throw new CandidateCommandError("User record missing", 404);
  }
  return parseTtsLanguage(user.voiceLanguage);
}

export async function saveCandidateVoiceLanguage(
  userId: string,
  languageCode: string,
): Promise<TtsLanguageCode> {
  if (!isTtsLanguageCode(languageCode)) {
    throw new CandidateCommandError("Invalid language_code", 400);
  }
  await ensureIndexes();
  const db = client.db(DB_NAME);
  const result = await db
    .collection<UserDoc>(COLLECTIONS.USERS_COLLECTION)
    .updateOne({ _id: matchId(userId) as never }, {
      $set: { voiceLanguage: languageCode },
    } as never);
  if (result.matchedCount !== 1) {
    throw new CandidateCommandError("User record missing", 404);
  }
  return languageCode;
}
