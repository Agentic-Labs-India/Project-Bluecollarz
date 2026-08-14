import "server-only";

import { ObjectId } from "mongodb";
import client, { DB_NAME, COLLECTIONS } from "@/lib/db";

/** Consent notice version — bump when Artifact 2 text changes. */
export const CONSENT_NOTICE_VERSION = "1.0";

export const CONSENT_PURPOSES = [
  "identity",
  "contact",
  "qualification",
  "background",
  "passport",
] as const;

export type ConsentPurpose = (typeof CONSENT_PURPOSES)[number];

export type ConsentStatus = "granted" | "withdrawn";

export type ConsentMethod = "voice_tap" | "web_tap" | "settings";

export interface ConsentEventDocument {
  _id?: ObjectId;
  consentId: string;
  dataPrincipalId: string;
  purposes: ConsentPurpose[];
  noticeVersion: string;
  timestamp: Date;
  method: ConsentMethod;
  status: ConsentStatus;
}

/** DigiLocker identity verification requires these purposes currently granted. */
export const DIGILOCKER_REQUIRED_PURPOSES: ConsentPurpose[] = [
  "identity",
  "contact",
];

/** Hire-facing assurance release also requires active identity+contact consent. */
export const HIRE_RELEASE_REQUIRED_PURPOSES = DIGILOCKER_REQUIRED_PURPOSES;

export function isConsentPurpose(value: string): value is ConsentPurpose {
  return (CONSENT_PURPOSES as readonly string[]).includes(value);
}

function eventsCollection() {
  return client
    .db(DB_NAME)
    .collection<ConsentEventDocument>(COLLECTIONS.CONSENT_EVENTS);
}

/** Append-only grant or withdrawal. Never updates prior rows. */
export async function appendConsentEvent(input: {
  dataPrincipalId: string;
  purposes: ConsentPurpose[];
  status: ConsentStatus;
  method?: ConsentMethod;
  noticeVersion?: string;
}): Promise<ConsentEventDocument> {
  const purposes = [...new Set(input.purposes)];
  if (!purposes.length) {
    throw new Error("At least one purpose is required");
  }
  const doc: ConsentEventDocument = {
    consentId: new ObjectId().toHexString(),
    dataPrincipalId: input.dataPrincipalId,
    purposes,
    noticeVersion: input.noticeVersion ?? CONSENT_NOTICE_VERSION,
    timestamp: new Date(),
    method: input.method ?? "web_tap",
    status: input.status,
  };
  await eventsCollection().insertOne(doc);
  return doc;
}

function activeFromEvents(events: ConsentEventDocument[]): {
  purposes: ConsentPurpose[];
  noticeVersion: string | null;
  grantedAt: string | null;
} {
  // Newest first.
  const sorted = [...events].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
  );

  const latest = new Map<ConsentPurpose, ConsentEventDocument>();
  for (const event of sorted) {
    for (const purpose of event.purposes) {
      if (!latest.has(purpose)) latest.set(purpose, event);
    }
  }

  const purposes: ConsentPurpose[] = [];
  let grantedAt: Date | null = null;
  let noticeVersion: string | null = null;

  for (const purpose of CONSENT_PURPOSES) {
    const event = latest.get(purpose);
    // Grant only counts for the current notice version; withdraw always wins.
    if (
      event?.status === "granted" &&
      event.noticeVersion === CONSENT_NOTICE_VERSION
    ) {
      purposes.push(purpose);
      if (!grantedAt || event.timestamp > grantedAt) {
        grantedAt = event.timestamp;
        noticeVersion = event.noticeVersion;
      }
    }
  }

  return {
    purposes,
    noticeVersion,
    grantedAt: grantedAt ? grantedAt.toISOString() : null,
  };
}

/**
 * Latest status per purpose for a principal.
 * Grants on an older notice version are not active (forces re-consent on bump).
 */
export async function getActivePurposes(
  dataPrincipalId: string,
): Promise<{
  purposes: ConsentPurpose[];
  noticeVersion: string | null;
  grantedAt: string | null;
}> {
  const events = await eventsCollection()
    .find({ dataPrincipalId })
    .sort({ timestamp: -1 })
    .toArray();
  return activeFromEvents(events);
}

export async function hasGrantedPurposes(
  dataPrincipalId: string,
  required: ConsentPurpose[],
): Promise<boolean> {
  const { purposes } = await getActivePurposes(dataPrincipalId);
  return required.every((p) => purposes.includes(p));
}

/**
 * Batch: which principals currently grant all `required` purposes.
 * One query for hire list enrichment (no N+1).
 */
export async function principalsWithGrantedPurposes(
  dataPrincipalIds: string[],
  required: ConsentPurpose[],
): Promise<Set<string>> {
  const ids = [...new Set(dataPrincipalIds.filter(Boolean))];
  const granted = new Set<string>();
  if (!ids.length || !required.length) return granted;

  const events = await eventsCollection()
    .find({ dataPrincipalId: { $in: ids } })
    .sort({ timestamp: -1 })
    .toArray();

  const byPrincipal = new Map<string, ConsentEventDocument[]>();
  for (const event of events) {
    const list = byPrincipal.get(event.dataPrincipalId) ?? [];
    list.push(event);
    byPrincipal.set(event.dataPrincipalId, list);
  }

  for (const id of ids) {
    const { purposes } = activeFromEvents(byPrincipal.get(id) ?? []);
    if (required.every((p) => purposes.includes(p))) granted.add(id);
  }
  return granted;
}

export async function listConsentEvents(
  dataPrincipalId: string,
): Promise<ConsentEventDocument[]> {
  return eventsCollection()
    .find({ dataPrincipalId })
    .sort({ timestamp: -1 })
    .toArray();
}
