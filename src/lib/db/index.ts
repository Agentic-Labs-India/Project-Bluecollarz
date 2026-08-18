import "server-only";
import { attachDatabasePool } from "@vercel/functions";
import { MongoClient, type MongoClientOptions, ObjectId } from "mongodb";

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
  USER_PROVISIONS: "UserProvisions",
  SUPPORT_TICKETS: "SupportTickets",
  RECRUITER_INQUIRIES: "RecruiterInquiries",
  HIRE_ONBOARDINGS: "HireOnboardings",
  BLOGS: "Blogs",
  JOBS: "Jobs",
  APPLICATIONS: "Applications",
  INTERVIEWS: "Interviews",
  MEDICAL_CENTERS: "MedicalCenters",
  MEDICAL_APPOINTMENTS: "MedicalAppointments",
  PLATFORM_SETTINGS: "PlatformSettings",
  CONSENT_EVENTS: "ConsentEvents",
  CONSENT_PLAYBACKS: "ConsentPlaybacks",
  RIGHTS_REQUESTS: "RightsRequests",
  BREACH_INCIDENTS: "BreachIncidents",
  LEGAL_HOLDS: "LegalHolds",
  LEGAL_SAFETY_CASES: "LegalSafetyCases",
  LEGAL_SAFETY_NOTICES: "LegalSafetyNotices",
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
