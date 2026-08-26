import "server-only";
import { auth } from "@/lib/auth/auth";
import {
  appendConsentEvent,
  DIGILOCKER_REQUIRED_PURPOSES,
} from "@/lib/compliance/consent";
import { parseDateOnly } from "@/lib/core/dates";
import client, { COLLECTIONS, DB_NAME, matchId } from "@/lib/db";
import { ensureIndexes } from "@/lib/db/indexes";
import {
  digilockerProfileSet,
  identityMismatches,
  type UserKyc,
} from "@/lib/kyc";
import type { DigilockerKycPayload } from "@/lib/kyc/digilocker";
import { idHex } from "@/lib/utils";

export const DIGILOCKER_PROVIDER = "digilocker";

type UserDoc = {
  _id: unknown;
  profileType?: string;
  digilockerId?: string;
  phoneNumber?: number;
  dateOfBirth?: Date;
  kyc?: UserKyc | null;
};

function users() {
  return client.db(DB_NAME).collection<UserDoc>(COLLECTIONS.USERS_COLLECTION);
}

export async function findUserByDigilockerId(digilockerId: string) {
  await ensureIndexes();
  return users().findOne({ digilockerId });
}

function mongoUserId(doc: UserDoc): string {
  return idHex(doc._id);
}

function assertWorkCandidate(doc: UserDoc) {
  if (doc.profileType && doc.profileType !== "work") {
    throw new Error("This DigiLocker account cannot sign in as a candidate.");
  }
}

async function refreshKyc(userId: string, doc: UserDoc, payload: DigilockerKycPayload, verifiedAt: Date) {
  const existingKyc = doc.kyc ?? null;
  const mismatches = identityMismatches(
    {
      phoneNumber:
        typeof doc.phoneNumber === "number" ? doc.phoneNumber : null,
      dateOfBirth: parseDateOnly(doc.dateOfBirth),
      pan: existingKyc?.pan ?? null,
      aadhaarLast4: existingKyc?.aadhaarLast4 ?? null,
      gender: existingKyc?.gender ?? null,
    },
    payload,
  );
  if (mismatches.length) {
    throw new Error(mismatches.join(" "));
  }
  const { $set } = digilockerProfileSet(payload, verifiedAt);
  await users().updateOne({ _id: matchId(userId) as never }, { $set });
}

/**
 * Login/signup by DigiLocker user id. Reverify only refreshes that same candidate.
 */
export async function upsertCandidateFromDigilocker(input: {
  payload: DigilockerKycPayload;
  verifiedAt: Date;
  sessionUserId?: string;
}): Promise<{ userId: string; created: boolean }> {
  const digilockerId = input.payload.digilockerId.trim();
  await ensureIndexes();
  const existing = await findUserByDigilockerId(digilockerId);

  if (input.sessionUserId) {
    if (!existing || mongoUserId(existing) !== input.sessionUserId) {
      throw new Error("DigiLocker identity does not match this account.");
    }
    assertWorkCandidate(existing);
    await refreshKyc(input.sessionUserId, existing, input.payload, input.verifiedAt);
    return { userId: input.sessionUserId, created: false };
  }

  if (existing) {
    assertWorkCandidate(existing);
    const userId = mongoUserId(existing);
    await refreshKyc(userId, existing, input.payload, input.verifiedAt);
    return { userId, created: false };
  }

  const ctx = await auth.$context;
  const { $set } = digilockerProfileSet(input.payload, input.verifiedAt);
  const created = await ctx.internalAdapter.createUser({
    name:
      typeof $set.name === "string" && $set.name.trim()
        ? $set.name.trim()
        : "Candidate",
    email: digilockerId,
    emailVerified: true,
    profileType: "work",
    digilockerId,
    isKycVerified: true,
  });
  const userId = created.id;
  if (!userId) {
    throw new Error("Could not create candidate account.");
  }

  try {
    await users().updateOne({ _id: matchId(userId) as never }, { $set });
    await ctx.internalAdapter.createAccount({
      userId,
      accountId: digilockerId,
      providerId: DIGILOCKER_PROVIDER,
    });
    await appendConsentEvent({
      dataPrincipalId: userId,
      purposes: [...DIGILOCKER_REQUIRED_PURPOSES],
      status: "granted",
      method: "web_tap",
    });
    return { userId, created: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = (error as { code?: number }).code;
    if (code === 11000 || /duplicate|already exists|unique/i.test(message)) {
      const raced = await findUserByDigilockerId(digilockerId);
      if (raced) return { userId: mongoUserId(raced), created: false };
    }
    throw error;
  }
}
