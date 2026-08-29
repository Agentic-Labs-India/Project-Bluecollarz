import "server-only";

import { ObjectId } from "mongodb";
import { getGrievanceOfficer } from "@/lib/compliance/grievance";
import type {
  BreachIncidentDocument,
  BreachIncidentPublic,
  BreachStatus,
} from "@/lib/compliance/types";
import client, { COLLECTIONS, DB_NAME } from "@/lib/db";

export {
  BREACH_STATUSES,
  type BreachIncidentDocument,
  type BreachIncidentPublic,
  type BreachStatus,
} from "@/lib/compliance/types";

function col() {
  return client
    .db(DB_NAME)
    .collection<BreachIncidentDocument>(COLLECTIONS.BREACH_INCIDENTS);
}

export async function createBreachIncident(input: {
  title: string;
  summary: string;
  createdBy: string;
  affectedPrincipalIds?: string[];
  notifyBoard?: boolean;
  notifyPrincipals?: boolean;
}): Promise<BreachIncidentDocument> {
  const now = new Date();
  const doc: BreachIncidentDocument = {
    incidentId: new ObjectId().toHexString(),
    title: input.title.trim(),
    summary: input.summary.trim(),
    status: "detected",
    affectedPrincipalIds: input.affectedPrincipalIds ?? [],
    notifyBoard: input.notifyBoard !== false,
    notifyPrincipals: input.notifyPrincipals !== false,
    boardNotifiedAt: null,
    principalsNotifiedAt: null,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  };
  await col().insertOne(doc);
  return doc;
}

export async function listBreachIncidents() {
  return col().find({}).sort({ createdAt: -1 }).limit(100).toArray();
}

export async function updateBreachIncident(input: {
  incidentId: string;
  status: BreachStatus;
  markBoardNotified?: boolean;
  markPrincipalsNotified?: boolean;
}): Promise<BreachIncidentDocument | null> {
  const now = new Date();
  const $set: Partial<BreachIncidentDocument> = {
    status: input.status,
    updatedAt: now,
  };
  if (input.markBoardNotified) $set.boardNotifiedAt = now;
  if (input.markPrincipalsNotified) $set.principalsNotifiedAt = now;

  const result = await col().findOneAndUpdate(
    { incidentId: input.incidentId },
    { $set },
    { returnDocument: "after" },
  );
  return result ?? null;
}

/** Plain-language notification template for ops / email desk. */
export async function breachNotificationCopy(incident: BreachIncidentDocument) {
  const go = await getGrievanceOfficer();
  return {
    subject: `Personal data breach notice — ${incident.incidentId}`,
    body: [
      `We are writing about a personal data incident (${incident.incidentId}).`,
      "",
      `Nature, extent and timing: ${incident.summary}`,
      "",
      `Status: ${incident.status}.`,
      "Likely consequences: we will describe any risk to you in follow-up if it is more than this summary.",
      "Measures we have taken: we are investigating, containing the incident, and limiting further access.",
      "What you can do: do not share one-time codes; change your Google password if you used that account elsewhere; contact us if you see unexpected sign-in activity.",
      "",
      `Contact for queries: ${go.name} <${go.email}>`,
      go.phone ? `Phone: ${go.phone}` : "",
      `Postal: ${go.postalAddress}`,
      "You may also complain to the Data Protection Board of India.",
      `OWRC helpline: ${go.owrcHelpline}`,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

export async function serializeBreach(
  doc: BreachIncidentDocument,
): Promise<BreachIncidentPublic> {
  return {
    incidentId: doc.incidentId,
    title: doc.title,
    summary: doc.summary,
    status: doc.status,
    affectedCount: doc.affectedPrincipalIds.length,
    notifyBoard: doc.notifyBoard,
    notifyPrincipals: doc.notifyPrincipals,
    boardNotifiedAt: doc.boardNotifiedAt
      ? doc.boardNotifiedAt.toISOString()
      : null,
    principalsNotifiedAt: doc.principalsNotifiedAt
      ? doc.principalsNotifiedAt.toISOString()
      : null,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    notificationPreview: await breachNotificationCopy(doc),
  };
}
