import client, { DB_NAME, COLLECTIONS, matchId } from "@/lib/db";
import {
  isCandidateProfileComplete,
  toCandidateProfileData,
  type CandidateProfileData,
  type CandidateProfileFields,
} from "@/lib/candidate/profile";

type UserDoc = CandidateProfileFields & {
  _id: unknown;
  name?: string;
  email?: string;
  image?: string;
  profileType?: string;
};

export async function getCandidateProfileByUserId(
  userId: string,
): Promise<CandidateProfileData | null> {
  if (!userId) return null;
  const db = client.db(DB_NAME);
  const doc = await db
    .collection<UserDoc>(COLLECTIONS.USERS_COLLECTION)
    .findOne({ _id: matchId(userId) as never });
  if (!doc) return null;
  return toCandidateProfileData(doc);
}

export async function isCandidateOnboardingDone(
  userId: string,
): Promise<boolean> {
  const profile = await getCandidateProfileByUserId(userId);
  if (!profile) return false;
  // Always validate live mandatory fields (not only the stored flag),
  // so newly required fields re-open onboarding for incomplete profiles.
  return isCandidateProfileComplete(profile);
}
