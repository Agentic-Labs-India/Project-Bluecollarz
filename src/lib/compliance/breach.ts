import "server-only";

import { ObjectId } from "mongodb";
import client, { DB_NAME, COLLECTIONS } from "@/lib/db";
import { getGrievanceOfficer } from "@/lib/compliance/grievance";

export const BREACH_STATUSES = [
  "detected",
  "investigating",
  "notified",
  "closed",
] as const;

export type BreachStatus = (typeof BREACH_STATUSES)[number];

export interface BreachIncidentDocument {
  _id?: ObjectId;
  incidentId: string;
  title: string;
  summary: string;
  status: BreachStatus;
  affectedPrincipalIds: string[];
  notifyBoard: boolean;
  notifyPrincipals: boolean;
  boardNotifiedAt?: Date | null;
  principalsNotifiedAt?: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

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
export function breachNotificationCopy(incident: BreachIncidentDocument) {
  const go = getGrievanceOfficer();
  return {
    subject: `Personal data breach notice — ${incident.incidentId}`,
    body: [
      `We are writing about a personal data incident (${incident.incidentId}).`,
      "",
      incident.summary,
      "",
      `Status: ${incident.status}.`,
      `Grievance Officer: ${go.name} <${go.email}>`,
      `You may also contact the Data Protection Board of India if unresolved.`,
      `OWRC helpline: ${go.owrcHelpline}`,
    ].join("\n"),
  };
}

export function serializeBreach(doc: BreachIncidentDocument) {
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
    notificationPreview: breachNotificationCopy(doc),
  };
}
