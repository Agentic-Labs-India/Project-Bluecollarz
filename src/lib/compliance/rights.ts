import "server-only";

import { ObjectId } from "mongodb";
import { blobFileUrl } from "@/lib/blob/pathname";
import { getCandidateProfileByUserId } from "@/lib/candidate/queries";
import { listConsentEvents } from "@/lib/compliance/consent";
import client, { COLLECTIONS, DB_NAME, matchId } from "@/lib/db";
import { toKycPublicState } from "@/lib/kyc";

export const RIGHTS_REQUEST_TYPES = [
  "access",
  "correction",
  "erasure",
  "withdraw",
  "nominate",
  "grievance",
  "restriction",
  "objection",
  "portability",
] as const;

export type RightsRequestType = (typeof RIGHTS_REQUEST_TYPES)[number];

export const RIGHTS_REQUEST_STATUSES = [
  "received",
  "acknowledged",
  "in_progress",
  "resolved",
  "rejected",
] as const;

export type RightsRequestStatus = (typeof RIGHTS_REQUEST_STATUSES)[number];

export {
  RIGHTS_ACKNOWLEDGE_HOURS,
  RIGHTS_RESOLVE_DAYS,
} from "@/lib/compliance/timelines";

export interface RightsRequestDocument {
  _id?: ObjectId;
  requestId: string;
  dataPrincipalId: string;
  email: string;
  type: RightsRequestType;
  status: RightsRequestStatus;
  details: string;
  nomineeName?: string | null;
  nomineeEmail?: string | null;
  adminNotes?: string | null;
  createdAt: Date;
  acknowledgedAt?: Date | null;
  resolvedAt?: Date | null;
  updatedAt: Date;
}

function col() {
  return client
    .db(DB_NAME)
    .collection<RightsRequestDocument>(COLLECTIONS.RIGHTS_REQUESTS);
}

export async function createRightsRequest(input: {
  dataPrincipalId: string;
  email: string;
  type: RightsRequestType;
  details: string;
  nomineeName?: string;
  nomineeEmail?: string;
}): Promise<RightsRequestDocument> {
  const now = new Date();
  const doc: RightsRequestDocument = {
    requestId: new ObjectId().toHexString(),
    dataPrincipalId: input.dataPrincipalId,
    email: input.email.trim().toLowerCase(),
    type: input.type,
    status: "received",
    details: input.details.trim(),
    nomineeName: input.nomineeName?.trim() || null,
    nomineeEmail: input.nomineeEmail?.trim().toLowerCase() || null,
    adminNotes: null,
    createdAt: now,
    acknowledgedAt: null,
    resolvedAt: null,
    updatedAt: now,
  };
  await col().insertOne(doc);
  return doc;
}

export async function listRightsRequestsForUser(userId: string) {
  return col()
    .find({ dataPrincipalId: userId })
    .sort({ createdAt: -1 })
    .toArray();
}

export async function listRightsRequestsAdmin(status?: RightsRequestStatus) {
  const filter =
    status && (RIGHTS_REQUEST_STATUSES as readonly string[]).includes(status)
      ? { status }
      : {};
  return col().find(filter).sort({ createdAt: -1 }).limit(200).toArray();
}

export async function updateRightsRequest(input: {
  requestId: string;
  status: RightsRequestStatus;
  adminNotes?: string;
}): Promise<RightsRequestDocument | null> {
  const now = new Date();
  const $set: Partial<RightsRequestDocument> = {
    status: input.status,
    updatedAt: now,
  };
  if (input.adminNotes !== undefined) $set.adminNotes = input.adminNotes;
  if (input.status === "acknowledged") $set.acknowledgedAt = now;
  if (input.status === "resolved" || input.status === "rejected") {
    $set.resolvedAt = now;
  }

  const result = await col().findOneAndUpdate(
    { requestId: input.requestId },
    { $set },
    { returnDocument: "after" },
  );
  return result ?? null;
}

/** JSON package for Data Principal access requests. */
export async function buildAccessExport(userId: string) {
  const profile = await getCandidateProfileByUserId(userId);
  const user = await client
    .db(DB_NAME)
    .collection(COLLECTIONS.USERS_COLLECTION)
    .findOne({ _id: matchId(userId) as never });
  const consentEvents = await listConsentEvents(userId);
  const rights = await listRightsRequestsForUser(userId);

  const applications = await client
    .db(DB_NAME)
    .collection(COLLECTIONS.APPLICATIONS)
    .find({ applicantId: matchId(userId) } as never)
    .project({ jobId: 1, status: 1, createdAt: 1 })
    .toArray();

  const interviews = await client
    .db(DB_NAME)
    .collection(COLLECTIONS.INTERVIEWS)
    .find({ applicantId: matchId(userId) } as never)
    .project({
      jobId: 1,
      stageId: 1,
      status: 1,
      startedAt: 1,
      completedAt: 1,
      videoUrl: 1,
    })
    .toArray();

  const medicalAppointments = await client
    .db(DB_NAME)
    .collection(COLLECTIONS.MEDICAL_APPOINTMENTS)
    .find({ applicantId: matchId(userId) } as never)
    .project({
      jobId: 1,
      centerId: 1,
      scheduledAt: 1,
      status: 1,
      reports: 1,
      createdAt: 1,
    })
    .toArray();

  return {
    exportedAt: new Date().toISOString(),
    dataPrincipalId: userId,
    profile,
    kyc: toKycPublicState(user as never),
    consentEvents: consentEvents.map((e) => ({
      consentId: e.consentId,
      purposes: e.purposes,
      noticeVersion: e.noticeVersion,
      timestamp: e.timestamp.toISOString(),
      method: e.method,
      status: e.status,
    })),
    rightsRequests: rights.map((r) => ({
      requestId: r.requestId,
      type: r.type,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      details: r.details,
    })),
    applications: applications.map((a) => ({
      jobId: a.jobId,
      status: a.status,
      createdAt:
        a.createdAt instanceof Date
          ? a.createdAt.toISOString()
          : String(a.createdAt),
    })),
    interviews: interviews.map((i) => ({
      jobId: i.jobId,
      stageId: i.stageId,
      status: i.status,
      hasRecording: Boolean(i.videoUrl),
      recordingFile:
        typeof i.videoUrl === "string" ? blobFileUrl(i.videoUrl) : null,
      startedAt:
        i.startedAt instanceof Date
          ? i.startedAt.toISOString()
          : String(i.startedAt),
      completedAt: i.completedAt
        ? i.completedAt instanceof Date
          ? i.completedAt.toISOString()
          : String(i.completedAt)
        : null,
    })),
    medicalAppointments: medicalAppointments.map((m) => ({
      jobId: m.jobId,
      centerId: m.centerId,
      status: m.status,
      scheduledAt:
        m.scheduledAt instanceof Date
          ? m.scheduledAt.toISOString()
          : String(m.scheduledAt),
      reports: (Array.isArray(m.reports) ? m.reports : []).map(
        (r: { name?: string; url?: string; uploadedAt?: unknown }) => ({
          name: typeof r?.name === "string" ? r.name : "Report",
          file: typeof r?.url === "string" ? blobFileUrl(r.url) : null,
          uploadedAt:
            r?.uploadedAt instanceof Date
              ? r.uploadedAt.toISOString()
              : String(r?.uploadedAt ?? ""),
        }),
      ),
    })),
  };
}

export function serializeRightsRequest(
  doc: RightsRequestDocument,
  opts?: { includeAdminNotes?: boolean },
) {
  return {
    requestId: doc.requestId,
    type: doc.type,
    status: doc.status,
    details: doc.details,
    nomineeName: doc.nomineeName ?? null,
    nomineeEmail: doc.nomineeEmail ?? null,
    ...(opts?.includeAdminNotes ? { adminNotes: doc.adminNotes ?? null } : {}),
    email: doc.email,
    dataPrincipalId: doc.dataPrincipalId,
    createdAt: doc.createdAt.toISOString(),
    acknowledgedAt: doc.acknowledgedAt
      ? doc.acknowledgedAt.toISOString()
      : null,
    resolvedAt: doc.resolvedAt ? doc.resolvedAt.toISOString() : null,
    updatedAt: doc.updatedAt.toISOString(),
  };
}
