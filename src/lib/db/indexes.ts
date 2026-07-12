import client, { DB_NAME, COLLECTIONS } from "@/lib/db";
import { JOB_INDEX_SPECS } from "@/lib/jobs";
import { APPLICATION_INDEX_SPECS } from "@/lib/jobs/applications";
import { INTERVIEW_INDEX_SPECS } from "@/lib/interviews";

let ensured = false;

/** Create the indexes the app relies on. Runs once per process. */
export async function ensureIndexes() {
  if (ensured) return;
  const db = client.db(DB_NAME);
  const tasks = [
    ...JOB_INDEX_SPECS.map((spec) =>
      db.collection(COLLECTIONS.JOBS).createIndex(spec.key),
    ),
    ...APPLICATION_INDEX_SPECS.map((spec) =>
      db.collection(COLLECTIONS.APPLICATIONS).createIndex(spec.key, spec.options),
    ),
    ...INTERVIEW_INDEX_SPECS.map((spec) =>
      db.collection(COLLECTIONS.INTERVIEWS).createIndex(spec.key, spec.options),
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
