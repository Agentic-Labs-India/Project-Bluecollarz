import "server-only";

import { ObjectId } from "mongodb";
import client, { COLLECTIONS, DB_NAME } from "@/lib/db";

export const LEGAL_HOLD_REASONS = [
  "serious_offence_review",
  "regulatory_request",
  "litigation",
] as const;

export type LegalHoldReason = (typeof LEGAL_HOLD_REASONS)[number];

export interface LegalHoldDocument {
  _id?: ObjectId;
  holdId: string;
  dataPrincipalId: string;
  reason: LegalHoldReason;
  caseId: string | null;
  note: string;
  placedById: string;
  placedByEmail: string;
  placedAt: Date;
  releasedAt: Date | null;
  releasedById: string | null;
  releasedByEmail: string | null;
}

/**
 * Erasure cannot destroy material that is under preservation. DPDP s.12(3)
 * lets a Data Fiduciary refuse erasure where retention is required for
 * compliance with law, and a live serious-offence review is exactly that.
 */
export class LegalHoldError extends Error {
  readonly status = 409;
  readonly code = "LEGAL_HOLD_ACTIVE";
  constructor(message: string) {
    super(message);
    this.name = "LegalHoldError";
  }
}

function holds() {
  return client
    .db(DB_NAME)
    .collection<LegalHoldDocument>(COLLECTIONS.LEGAL_HOLDS);
}

async function isUnderLegalHold(dataPrincipalId: string): Promise<boolean> {
  if (!dataPrincipalId) return false;
  const active = await holds().findOne(
    { dataPrincipalId, releasedAt: null },
    { projection: { _id: 1 } },
  );
  return Boolean(active);
}

export async function placeLegalHold(input: {
  dataPrincipalId: string;
  reason: LegalHoldReason;
  caseId?: string | null;
  note: string;
  actor: { id: string; email: string };
}): Promise<LegalHoldDocument> {
  const doc: LegalHoldDocument = {
    holdId: new ObjectId().toHexString(),
    dataPrincipalId: input.dataPrincipalId,
    reason: input.reason,
    caseId: input.caseId ?? null,
    note: input.note.trim(),
    placedById: input.actor.id,
    placedByEmail: input.actor.email,
    placedAt: new Date(),
    releasedAt: null,
    releasedById: null,
    releasedByEmail: null,
  };
  await holds().insertOne(doc);
  return doc;
}

/** Release is always attributable to a named human. */
export async function releaseLegalHold(input: {
  holdId: string;
  actor: { id: string; email: string };
}): Promise<LegalHoldDocument | null> {
  const result = await holds().findOneAndUpdate(
    { holdId: input.holdId, releasedAt: null },
    {
      $set: {
        releasedAt: new Date(),
        releasedById: input.actor.id,
        releasedByEmail: input.actor.email,
      },
    },
    { returnDocument: "after" },
  );
  return result ?? null;
}

/** Throws when the principal's data must be preserved. */
export async function assertNoLegalHold(
  dataPrincipalId: string,
): Promise<void> {
  if (await isUnderLegalHold(dataPrincipalId)) {
    throw new LegalHoldError(
      "This account is under a legal hold and cannot be deleted. Contact the grievance officer.",
    );
  }
}
