import "server-only";

import { ObjectId } from "mongodb";
import client, { DB_NAME, COLLECTIONS } from "@/lib/db";

/** Feature flag — counsel-gated Model 2 stubs. */
export function isPlacementAuditEnabled(): boolean {
  return process.env.ENABLE_PLACEMENT_AUDIT === "1";
}

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

const ALWAYS_RECORD_KINDS = new Set(["job_published_after_admin_verify"]);

/**
 * Append an immutable placement/journey audit event.
 * Job-publish events always persist. Other Model 2 kinds no-op unless
 * ENABLE_PLACEMENT_AUDIT=1.
 */
export async function appendPlacementAuditEvent(input: {
  kind: string;
  jobId?: string;
  applicantId?: string;
  raRcNumber?: string;
  payload?: Record<string, unknown>;
}): Promise<PlacementAuditEventDocument | null> {
  if (
    !ALWAYS_RECORD_KINDS.has(input.kind) &&
    !isPlacementAuditEnabled()
  ) {
    return null;
  }

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
    .collection<PlacementAuditEventDocument>(
      COLLECTIONS.PLACEMENT_AUDIT_EVENTS,
    )
    .insertOne(doc);
  return doc;
}
