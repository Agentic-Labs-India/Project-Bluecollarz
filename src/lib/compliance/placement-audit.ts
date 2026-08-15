import "server-only";

import { ObjectId } from "mongodb";
import client, { COLLECTIONS, DB_NAME } from "@/lib/db";

export interface PlacementAuditEventDocument {
  _id?: ObjectId;
  eventId: string;
  jobId?: string | null;
  applicantId?: string | null;
  raRcNumber?: string | null;
  kind: string;
  payload?: Record<string, unknown>;
  createdAt: Date;
}

/** Append an immutable placement/journey audit event. */
export async function appendPlacementAuditEvent(input: {
  kind: string;
  jobId?: string;
  applicantId?: string;
  raRcNumber?: string;
  payload?: Record<string, unknown>;
}): Promise<PlacementAuditEventDocument> {
  const doc: PlacementAuditEventDocument = {
    eventId: new ObjectId().toHexString(),
    jobId: input.jobId ?? null,
    applicantId: input.applicantId ?? null,
    raRcNumber: input.raRcNumber ?? null,
    kind: input.kind,
    payload: input.payload ?? {},
    createdAt: new Date(),
  };
  await client
    .db(DB_NAME)
    .collection<PlacementAuditEventDocument>(COLLECTIONS.PLACEMENT_AUDIT_EVENTS)
    .insertOne(doc);
  return doc;
}
