import "server-only";
import { ObjectId, MongoClient, type MongoClientOptions } from "mongodb";
import { attachDatabasePool } from "@vercel/functions";

const options: MongoClientOptions = {
  appName: "devrel.vercel.integration",
  maxIdleTimeMS: 5000,
};

const client = new MongoClient(process.env.MONGODB_URI || "", options);
attachDatabasePool(client);

export default client;

export const DB_NAME = process.env.DB_NAME;

export const COLLECTIONS = {
  USERS_COLLECTION: "Users",
  JOBS: "Jobs",
  APPLICATIONS: "Applications",
  INTERVIEWS: "Interviews",
} as const;

/** 24-char hex Mongo id. */
export function isId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

/**
 * Match an id whether Mongo stored it as ObjectId or hex string.
 * Use in filters: `{ ownerId: matchId(userId) }`
 */
export function matchId(id: string) {
  if (!isId(id)) return id;
  return { $in: [new ObjectId(id), id] as const };
}

/** Expand ids for `$in` queries. */
export function matchIds(ids: string[]) {
  return ids.flatMap((id) => (isId(id) ? [new ObjectId(id), id] : [id]));
}
