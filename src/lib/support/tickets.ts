import { ObjectId } from "mongodb";
import client, { COLLECTIONS, DB_NAME, isId, matchId } from "@/lib/db";
import { ensureIndexes } from "@/lib/db/indexes";
import type { ProfileType } from "@/lib/profile-types";
import { idHex } from "@/lib/utils";
import type {
  SupportPriority,
  SupportProblemType,
  SupportSeriousness,
  SupportStatus,
  SupportTicketDetail,
  SupportTicketListItem,
  SupportTranscriptTurn,
} from "@/lib/support/types";

type SupportTicketDoc = {
  _id: ObjectId;
  userId: string;
  email: string;
  profileType: ProfileType;
  transcript: SupportTranscriptTurn[];
  summary: string;
  problemType: SupportProblemType;
  seriousness: SupportSeriousness;
  priority: SupportPriority;
  status: SupportStatus;
  createdAt: Date;
  updatedAt: Date;
};

function toListItem(doc: SupportTicketDoc): SupportTicketListItem {
  return {
    id: idHex(doc._id),
    userId: doc.userId,
    email: doc.email,
    profileType: doc.profileType,
    summary: doc.summary,
    problemType: doc.problemType,
    seriousness: doc.seriousness,
    priority: doc.priority,
    status: doc.status,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function createSupportTicket(input: {
  userId: string;
  email: string;
  profileType: ProfileType;
  transcript: SupportTranscriptTurn[];
  summary: string;
  problemType: SupportProblemType;
  seriousness: SupportSeriousness;
  priority: SupportPriority;
}): Promise<SupportTicketListItem> {
  await ensureIndexes();
  const now = new Date();
  const _id = new ObjectId();
  const doc: SupportTicketDoc = {
    _id,
    userId: input.userId,
    email: input.email.trim().toLowerCase(),
    profileType: input.profileType,
    transcript: input.transcript,
    summary: input.summary.trim(),
    problemType: input.problemType,
    seriousness: input.seriousness,
    priority: input.priority,
    status: "open",
    createdAt: now,
    updatedAt: now,
  };

  await client
    .db(DB_NAME)
    .collection<SupportTicketDoc>(COLLECTIONS.SUPPORT_TICKETS)
    .insertOne(doc);

  return toListItem(doc);
}

export async function listSupportTickets(opts?: {
  status?: SupportStatus;
  profileType?: ProfileType;
  priority?: SupportPriority;
  seriousness?: SupportSeriousness;
  limit?: number;
}): Promise<{ items: SupportTicketListItem[]; hasMore: boolean }> {
  await ensureIndexes();
  const limit = Math.min(Math.max(opts?.limit ?? 50, 1), 100);
  const filter: {
    status?: SupportStatus;
    profileType?: ProfileType;
    priority?: SupportPriority;
    seriousness?: SupportSeriousness;
  } = {};
  if (opts?.status) filter.status = opts.status;
  if (opts?.profileType) filter.profileType = opts.profileType;
  if (opts?.priority) filter.priority = opts.priority;
  if (opts?.seriousness) filter.seriousness = opts.seriousness;

  const docs = await client
    .db(DB_NAME)
    .collection<SupportTicketDoc>(COLLECTIONS.SUPPORT_TICKETS)
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .toArray();

  const hasMore = docs.length > limit;
  return {
    items: docs.slice(0, limit).map(toListItem),
    hasMore,
  };
}

export async function getSupportTicket(
  id: string,
): Promise<SupportTicketDetail | null> {
  if (!isId(id)) return null;
  await ensureIndexes();
  const doc = await client
    .db(DB_NAME)
    .collection<SupportTicketDoc>(COLLECTIONS.SUPPORT_TICKETS)
    .findOne({ _id: matchId(id) as never });

  if (!doc) return null;
  return {
    ...toListItem(doc),
    transcript: doc.transcript ?? [],
  };
}

export async function updateSupportTicketStatus(
  id: string,
  status: SupportStatus,
): Promise<SupportTicketListItem | null> {
  if (!isId(id)) return null;
  await ensureIndexes();
  const result = await client
    .db(DB_NAME)
    .collection<SupportTicketDoc>(COLLECTIONS.SUPPORT_TICKETS)
    .findOneAndUpdate(
      { _id: matchId(id) as never },
      { $set: { status, updatedAt: new Date() } },
      { returnDocument: "after" },
    );

  return result ? toListItem(result) : null;
}
