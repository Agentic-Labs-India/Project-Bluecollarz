import { ObjectId } from "mongodb";
import client, {
  COLLECTIONS,
  DB_NAME,
  isId,
  matchId,
  matchIds,
} from "@/lib/db";
import { ensureIndexes } from "@/lib/db/indexes";
import { screenWorkerText } from "@/lib/legal-safety/detect";
import type {
  SupportAssignee,
  SupportPriority,
  SupportProblemType,
  SupportSeriousness,
  SupportStatus,
  SupportTicketDetail,
  SupportTicketDocument,
  SupportTicketListItem,
  SupportTranscriptTurn,
} from "@/lib/support/types";
import { parseSupportStatus } from "@/lib/support/types";
import type { ProfileType } from "@/lib/user/profile-types";
import { idHex } from "@/lib/utils";

type SupportTicketDoc = SupportTicketDocument;

function toAssignee(doc: SupportTicketDoc): SupportAssignee | null {
  const id = doc.assigneeId?.trim();
  const email = doc.assigneeEmail?.trim().toLowerCase();
  if (!id || !email) return null;
  return {
    id,
    name: doc.assigneeName?.trim() || email,
    email,
  };
}

function contactEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (!email || email.endsWith("@users.invalid")) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

async function contactEmailByUserIds(
  userIds: string[],
): Promise<Map<string, string>> {
  const ids = [...new Set(userIds.filter(isId))];
  if (!ids.length) return new Map();
  const docs = await client
    .db(DB_NAME)
    .collection<{ _id: ObjectId; email?: string }>(COLLECTIONS.USERS_COLLECTION)
    .find({ _id: { $in: matchIds(ids) } as never })
    .project({ email: 1 })
    .toArray();
  const map = new Map<string, string>();
  for (const doc of docs) {
    const email = contactEmail(doc.email);
    if (email) map.set(idHex(doc._id), email);
  }
  return map;
}

function toListItem(
  doc: SupportTicketDoc,
  filerEmail: string | null,
): SupportTicketListItem {
  const assignee = toAssignee(doc);
  const parsed = parseSupportStatus(doc.status);
  if (!parsed) {
    throw new Error(`Invalid support ticket status: ${String(doc.status)}`);
  }
  let status = parsed;
  // Assignee presence drives assigned/open when not terminal.
  if (status !== "resolved" && status !== "closed") {
    status = assignee ? "assigned" : "open";
  }
  return {
    id: idHex(doc._id),
    userId: doc.userId,
    email: filerEmail ?? "",
    profileType: doc.profileType,
    summary: doc.summary,
    problemType: doc.problemType,
    seriousness: doc.seriousness,
    priority: doc.priority,
    status,
    assignee,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

async function toListItems(
  docs: SupportTicketDoc[],
): Promise<SupportTicketListItem[]> {
  const emails = await contactEmailByUserIds(docs.map((doc) => doc.userId));
  return docs.map((doc) => toListItem(doc, emails.get(doc.userId) ?? null));
}

async function toHydratedItem(
  doc: SupportTicketDoc,
): Promise<SupportTicketListItem> {
  const [item] = await toListItems([doc]);
  return item;
}

export async function createSupportTicket(input: {
  userId: string;
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
    profileType: input.profileType,
    transcript: input.transcript,
    summary: input.summary.trim(),
    problemType: input.problemType,
    seriousness: input.seriousness,
    priority: input.priority,
    status: "open",
    assigneeId: null,
    assigneeName: null,
    assigneeEmail: null,
    assignedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await client
    .db(DB_NAME)
    .collection<SupportTicketDoc>(COLLECTIONS.SUPPORT_TICKETS)
    .insertOne(doc);

  // Screen what the worker wrote, not the assistant's replies or the model's
  // summary, so a case rests on the worker's own words. Failure here must not
  // lose the ticket the worker just raised.
  if (input.profileType === "work") {
    const said = input.transcript
      .filter((turn) => turn.role === "user")
      .map((turn) => turn.content)
      .join("\n");
    try {
      await screenWorkerText({
        userId: input.userId,
        text: said,
        sourceKind: "chat",
        sourceId: idHex(_id),
      });
    } catch (error) {
      console.error(
        "[legal-safety] screening failed for support ticket",
        error,
      );
    }
  }

  return toHydratedItem(doc);
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
  const filter: Record<string, unknown> = {};
  if (opts?.status === "assigned") {
    filter.status = { $in: ["assigned", "in_progress"] };
  } else if (opts?.status) {
    filter.status = opts.status;
  }
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

  const page = docs.slice(0, limit);
  const hasMore = docs.length > limit;
  return {
    items: await toListItems(page),
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
    ...(await toHydratedItem(doc)),
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

  return result ? toHydratedItem(result) : null;
}

export type AssignTicketResult =
  | { ok: true; item: SupportTicketListItem }
  | {
      ok: false;
      reason: "not_found" | "already_assigned";
      assignee?: SupportAssignee;
    };

/** Claim/assign a ticket to an admin. Fails if another admin already owns it. */
export async function assignSupportTicket(input: {
  id: string;
  assignee: SupportAssignee;
}): Promise<AssignTicketResult> {
  if (!isId(input.id)) return { ok: false, reason: "not_found" };
  await ensureIndexes();
  const col = client
    .db(DB_NAME)
    .collection<SupportTicketDoc>(COLLECTIONS.SUPPORT_TICKETS);

  const now = new Date();
  const email = input.assignee.email.trim().toLowerCase();

  // Atomic claim: unassigned, or already owned by this admin.
  const result = await col.findOneAndUpdate(
    {
      _id: matchId(input.id) as never,
      $or: [
        { assigneeId: null },
        { assigneeId: { $exists: false } },
        { assigneeId: "" },
        { assigneeId: input.assignee.id },
      ],
    },
    [
      {
        $set: {
          assigneeId: input.assignee.id,
          assigneeName: input.assignee.name,
          assigneeEmail: email,
          assignedAt: { $ifNull: ["$assignedAt", now] },
          status: {
            $cond: [
              { $in: ["$status", ["resolved", "closed"]] },
              "$status",
              "assigned",
            ],
          },
          updatedAt: now,
        },
      },
    ],
    { returnDocument: "after" },
  );

  if (result) return { ok: true, item: await toHydratedItem(result) };

  const existing = await col.findOne({ _id: matchId(input.id) as never });
  if (!existing) return { ok: false, reason: "not_found" };
  const current = toAssignee(existing);
  return {
    ok: false,
    reason: "already_assigned",
    assignee: current ?? undefined,
  };
}
