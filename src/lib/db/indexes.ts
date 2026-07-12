import type { Collection, CreateIndexesOptions, IndexSpecification } from "mongodb";
import client, { DB_NAME, COLLECTIONS } from "@/lib/db";

/** Kept here (not in @/lib/jobs) so ensureIndexes stays free of app domain imports. */
const JOB_INDEX_SPECS = [
  { key: { ownerId: 1, status: 1, createdAt: -1 } },
  { key: { status: 1, tab: 1, createdAt: -1 } },
  { key: { status: 1, createdAt: -1 } },
] as const;

const APPLICATION_INDEX_SPECS = [
  { key: { applicantId: 1, jobId: 1 }, options: { unique: true } },
  { key: { jobId: 1, createdAt: -1 }, options: {} },
] as const;

const INTERVIEW_INDEX_SPECS = [
  {
    key: { applicantId: 1, jobId: 1, stageId: 1 },
    options: { unique: true },
  },
  { key: { jobId: 1, stageId: 1, status: 1 }, options: {} },
  { key: { applicantId: 1, status: 1, updatedAt: -1 }, options: {} },
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
      (typeof options.name === "string" && options.name) || defaultIndexName(key);
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
    ...INTERVIEW_INDEX_SPECS.map((spec) =>
      ensureIndex(
        db.collection(COLLECTIONS.INTERVIEWS),
        spec.key,
        spec.options,
      ),
    ),
  ];
  // Don't fail the process if a unique index can't build over legacy duplicates.
  await Promise.all(
    tasks.map((task) =>
      task.catch((error) => {
        console.warn("ensureIndexes:", error);
      }),
    ),
  );
  ensured = true;
}
