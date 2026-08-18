import type {
  Collection,
  CreateIndexesOptions,
  IndexSpecification,
} from "mongodb";
import client, { COLLECTIONS, DB_NAME } from "@/lib/db";

/** Kept here (not in @/lib/jobs) so ensureIndexes stays free of app domain imports. */
const JOB_INDEX_SPECS = [
  { key: { ownerId: 1, status: 1, createdAt: -1 } },
  { key: { status: 1, tab: 1, createdAt: -1 } },
  { key: { status: 1, createdAt: -1 } },
  /** Landing carousel + public sitemap sort by publish time. */
  { key: { status: 1, publishedAt: -1, createdAt: -1 } },
] as const;

const APPLICATION_INDEX_SPECS = [
  { key: { applicantId: 1, jobId: 1 }, options: { unique: true } },
  { key: { jobId: 1, createdAt: -1 }, options: {} },
  { key: { status: 1, createdAt: -1 }, options: {} },
] as const;

const USER_PROVISION_INDEX_SPECS = [
  { key: { email: 1 }, options: { unique: true } },
  { key: { profileType: 1, createdAt: -1 }, options: {} },
] as const;

const SUPPORT_TICKET_INDEX_SPECS = [
  { key: { createdAt: -1 }, options: {} },
  { key: { status: 1, createdAt: -1 }, options: {} },
  { key: { profileType: 1, createdAt: -1 }, options: {} },
  { key: { priority: 1, createdAt: -1 }, options: {} },
  { key: { seriousness: 1, createdAt: -1 }, options: {} },
] as const;

const RECRUITER_INQUIRY_INDEX_SPECS = [
  { key: { createdAt: -1 }, options: {} },
  { key: { status: 1, createdAt: -1 }, options: {} },
  { key: { email: 1, createdAt: -1 }, options: {} },
] as const;

const HIRE_ONBOARDING_INDEX_SPECS = [
  { key: { userId: 1 }, options: { unique: true } },
  { key: { status: 1, submittedAt: -1, updatedAt: -1 }, options: {} },
] as const;

const USER_INDEX_SPECS = [
  { key: { profileType: 1, createdAt: -1 }, options: {} },
  { key: { email: 1 }, options: {} },
  /** Re-consent campaigns: users still on an older notice version. */
  { key: { platformTermsVersion: 1 }, options: {} },
] as const;

const BLOG_INDEX_SPECS = [
  { key: { slug: 1 }, options: { unique: true } },
  { key: { status: 1, publishedAt: -1, createdAt: -1 }, options: {} },
] as const;

const INTERVIEW_INDEX_SPECS = [
  {
    key: { applicantId: 1, jobId: 1, stageId: 1 },
    options: { unique: true },
  },
  { key: { jobId: 1, stageId: 1, status: 1 }, options: {} },
  { key: { applicantId: 1, status: 1, updatedAt: -1 }, options: {} },
] as const;

const CONSENT_EVENT_INDEX_SPECS = [
  { key: { dataPrincipalId: 1, timestamp: -1 }, options: {} },
  { key: { consentId: 1 }, options: { unique: true } },
] as const;

const CONSENT_PLAYBACK_INDEX_SPECS = [
  { key: { playbackId: 1 }, options: { unique: true } },
  { key: { userId: 1, createdAt: -1 }, options: {} },
  { key: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },
] as const;

const RIGHTS_REQUEST_INDEX_SPECS = [
  { key: { dataPrincipalId: 1, createdAt: -1 }, options: {} },
  { key: { status: 1, createdAt: -1 }, options: {} },
  { key: { requestId: 1 }, options: { unique: true } },
] as const;

const BREACH_INCIDENT_INDEX_SPECS = [
  { key: { createdAt: -1 }, options: {} },
  { key: { status: 1, createdAt: -1 }, options: {} },
  { key: { incidentId: 1 }, options: { unique: true } },
] as const;

const MEDICAL_CENTER_INDEX_SPECS = [
  { key: { active: 1, name: 1 }, options: {} },
  { key: { licenseNumber: 1 }, options: {} },
] as const;

const LEGAL_HOLD_INDEX_SPECS = [
  { key: { dataPrincipalId: 1, releasedAt: 1 }, options: {} },
  { key: { holdId: 1 }, options: { unique: true } },
] as const;

const LEGAL_SAFETY_CASE_INDEX_SPECS = [
  { key: { caseId: 1 }, options: { unique: true } },
  { key: { subjectUserId: 1, state: 1 }, options: {} },
  { key: { state: 1, createdAt: -1 }, options: {} },
] as const;

const LEGAL_SAFETY_NOTICE_INDEX_SPECS = [
  {
    key: { userId: 1, noticeId: 1, noticeVersion: 1, deliveredAt: -1 },
    options: {},
  },
  { key: { deliveryId: 1 }, options: { unique: true } },
] as const;

const MEDICAL_APPOINTMENT_INDEX_SPECS = [
  { key: { applicationId: 1 }, options: { unique: true } },
  {
    key: { centerId: 1, scheduledAt: 1 },
    options: {
      unique: true,
      partialFilterExpression: { status: "scheduled" },
    },
  },
  { key: { applicantId: 1, jobId: 1, status: 1 }, options: {} },
  { key: { applicantId: 1, scheduledAt: -1 }, options: {} },
  { key: { scheduledAt: 1 }, options: {} },
  { key: { status: 1, scheduledAt: 1 }, options: {} },
  { key: { centerId: 1, status: 1, scheduledAt: 1 }, options: {} },
] as const;

let ensured = false;

/** Mongo auto-name for a key pattern, e.g. { a: 1, b: -1 } → "a_1_b_-1". */
function defaultIndexName(key: IndexSpecification): string {
  return Object.entries(key)
    .map(([field, direction]) => `${field}_${direction}`)
    .join("_");
}

/**
 * createIndex, dropping a same-name/same-key index first when options diverge
 * (e.g. non-unique → unique). Other failures are rethrown for the caller to soft-fail.
 */
async function ensureIndex(
  collection: Collection,
  key: IndexSpecification,
  options: CreateIndexesOptions = {},
) {
  try {
    await collection.createIndex(key, options);
  } catch (error) {
    const code = (error as { code?: number }).code;
    // 85 IndexOptionsConflict, 86 IndexKeySpecsConflict — same name/keys, different options.
    if (code !== 85 && code !== 86) throw error;

    const name =
      (typeof options.name === "string" && options.name) ||
      defaultIndexName(key);
    await collection.dropIndex(name);
    await collection.createIndex(key, options);
  }
}

/** Create the indexes the app relies on. Runs once per process. */
export async function ensureIndexes() {
  if (ensured) return;
  const db = client.db(DB_NAME);
  const tasks = [
    ...JOB_INDEX_SPECS.map((spec) =>
      ensureIndex(db.collection(COLLECTIONS.JOBS), spec.key),
    ),
    ...APPLICATION_INDEX_SPECS.map((spec) =>
      ensureIndex(
        db.collection(COLLECTIONS.APPLICATIONS),
        spec.key,
        spec.options,
      ),
    ),
    ...USER_PROVISION_INDEX_SPECS.map((spec) =>
      ensureIndex(
        db.collection(COLLECTIONS.USER_PROVISIONS),
        spec.key,
        spec.options,
      ),
    ),
    ...SUPPORT_TICKET_INDEX_SPECS.map((spec) =>
      ensureIndex(
        db.collection(COLLECTIONS.SUPPORT_TICKETS),
        spec.key,
        spec.options,
      ),
    ),
    ...RECRUITER_INQUIRY_INDEX_SPECS.map((spec) =>
      ensureIndex(
        db.collection(COLLECTIONS.RECRUITER_INQUIRIES),
        spec.key,
        spec.options,
      ),
    ),
    ...HIRE_ONBOARDING_INDEX_SPECS.map((spec) =>
      ensureIndex(
        db.collection(COLLECTIONS.HIRE_ONBOARDINGS),
        spec.key,
        spec.options,
      ),
    ),
    ...USER_INDEX_SPECS.map((spec) =>
      ensureIndex(
        db.collection(COLLECTIONS.USERS_COLLECTION),
        spec.key,
        spec.options,
      ),
    ),
    ...BLOG_INDEX_SPECS.map((spec) =>
      ensureIndex(db.collection(COLLECTIONS.BLOGS), spec.key, spec.options),
    ),
    ...INTERVIEW_INDEX_SPECS.map((spec) =>
      ensureIndex(
        db.collection(COLLECTIONS.INTERVIEWS),
        spec.key,
        spec.options,
      ),
    ),
    ...CONSENT_EVENT_INDEX_SPECS.map((spec) =>
      ensureIndex(
        db.collection(COLLECTIONS.CONSENT_EVENTS),
        spec.key,
        spec.options,
      ),
    ),
    ...CONSENT_PLAYBACK_INDEX_SPECS.map((spec) =>
      ensureIndex(
        db.collection(COLLECTIONS.CONSENT_PLAYBACKS),
        spec.key,
        spec.options,
      ),
    ),
    ...RIGHTS_REQUEST_INDEX_SPECS.map((spec) =>
      ensureIndex(
        db.collection(COLLECTIONS.RIGHTS_REQUESTS),
        spec.key,
        spec.options,
      ),
    ),
    ...BREACH_INCIDENT_INDEX_SPECS.map((spec) =>
      ensureIndex(
        db.collection(COLLECTIONS.BREACH_INCIDENTS),
        spec.key,
        spec.options,
      ),
    ),
    ...MEDICAL_CENTER_INDEX_SPECS.map((spec) =>
      ensureIndex(
        db.collection(COLLECTIONS.MEDICAL_CENTERS),
        spec.key,
        spec.options,
      ),
    ),
    ...MEDICAL_APPOINTMENT_INDEX_SPECS.map((spec) =>
      ensureIndex(
        db.collection(COLLECTIONS.MEDICAL_APPOINTMENTS),
        spec.key,
        spec.options,
      ),
    ),
    ...LEGAL_HOLD_INDEX_SPECS.map((spec) =>
      ensureIndex(
        db.collection(COLLECTIONS.LEGAL_HOLDS),
        spec.key,
        spec.options,
      ),
    ),
    ...LEGAL_SAFETY_CASE_INDEX_SPECS.map((spec) =>
      ensureIndex(
        db.collection(COLLECTIONS.LEGAL_SAFETY_CASES),
        spec.key,
        spec.options,
      ),
    ),
    ...LEGAL_SAFETY_NOTICE_INDEX_SPECS.map((spec) =>
      ensureIndex(
        db.collection(COLLECTIONS.LEGAL_SAFETY_NOTICES),
        spec.key,
        spec.options,
      ),
    ),
  ];
  // Log and continue if an index cannot build (e.g. unique conflict).
  await Promise.all(
    tasks.map((task) =>
      task.catch((error) => {
        console.warn("ensureIndexes:", error);
      }),
    ),
  );
  ensured = true;
}
