import "server-only";

import { ObjectId } from "mongodb";
import {
  CONSENT_NOTICE_VERSION,
  type ConsentPlaybackScope,
} from "@/lib/compliance/consent-notices";
import { type ConsentPurpose } from "@/lib/compliance/consent";
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

/** KYC and Settings speak the same notice; any non-empty valid set may grant. */
export function playbackMatchesGrant(
  _scope: ConsentPlaybackScope,
  purposes: ConsentPurpose[],
): boolean {
  return purposes.length > 0;
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
