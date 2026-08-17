import "server-only";

import { ObjectId } from "mongodb";
import {
  CONSENT_NOTICE_VERSION,
  type ConsentPlaybackScope,
} from "@/lib/compliance/consent-notices";
import {
  DIGILOCKER_REQUIRED_PURPOSES,
  type ConsentPurpose,
} from "@/lib/compliance/consent";
import client, { COLLECTIONS, DB_NAME } from "@/lib/db";

export const CONSENT_PLAYBACK_TTL_MS = 15 * 60 * 1000;

export type ConsentPlaybackDocument = {
  playbackId: string;
  userId: string;
  scope: ConsentPlaybackScope;
  noticeVersion: string;
  createdAt: Date;
  expiresAt: Date;
  consumedAt: Date | null;
};

function playbacks() {
  return client
    .db(DB_NAME)
    .collection<ConsentPlaybackDocument>(COLLECTIONS.CONSENT_PLAYBACKS);
}

export function playbackMatchesGrant(
  scope: ConsentPlaybackScope,
  purposes: ConsentPurpose[],
): boolean {
  if (!purposes.length) return false;
  if (scope === "medical") {
    return purposes.length === 1 && purposes[0] === "medical";
  }
  if (scope === "kyc") {
    return purposes.every((purpose) =>
      DIGILOCKER_REQUIRED_PURPOSES.includes(purpose),
    );
  }
  return true;
}

export async function issueConsentPlayback(input: {
  userId: string;
  scope: ConsentPlaybackScope;
}): Promise<ConsentPlaybackDocument> {
  const now = new Date();
  const doc: ConsentPlaybackDocument = {
    playbackId: new ObjectId().toHexString(),
    userId: input.userId,
    scope: input.scope,
    noticeVersion: CONSENT_NOTICE_VERSION,
    createdAt: now,
    expiresAt: new Date(now.getTime() + CONSENT_PLAYBACK_TTL_MS),
    consumedAt: null,
  };
  await playbacks().insertOne(doc);
  return doc;
}

/** Single-use. Returns null if missing, expired, already used, or wrong user. */
export async function consumeConsentPlayback(input: {
  userId: string;
  playbackId: string;
}): Promise<ConsentPlaybackDocument | null> {
  const now = new Date();
  return playbacks().findOneAndUpdate(
    {
      playbackId: input.playbackId,
      userId: input.userId,
      consumedAt: null,
      expiresAt: { $gt: now },
      noticeVersion: CONSENT_NOTICE_VERSION,
    },
    { $set: { consumedAt: now } },
    { returnDocument: "after" },
  );
}
