import type { ProfileType } from "@/lib/user/profile-types";

export const SUPPORT_PROBLEM_TYPES = [
  "account",
  "onboarding",
  "interview",
  "kyc",
  "applications",
  "roles",
  "billing",
  "bugs",
  "other",
] as const;

export const SUPPORT_SERIOUSNESS = [
  "low",
  "medium",
  "high",
  "critical",
] as const;

export const SUPPORT_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

/** `in_progress` removed — use `assigned` after an admin replies by email. */
export const SUPPORT_STATUSES = [
  "open",
  "assigned",
  "resolved",
  "closed",
] as const;

export type SupportProblemType = (typeof SUPPORT_PROBLEM_TYPES)[number];
export type SupportSeriousness = (typeof SUPPORT_SERIOUSNESS)[number];
export type SupportPriority = (typeof SUPPORT_PRIORITIES)[number];
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

export type SupportTranscriptTurn = {
  role: "user" | "assistant";
  content: string;
};

export type SupportAssignee = {
  id: string;
  name: string;
  email: string;
};

export type SupportTicketListItem = {
  id: string;
  userId: string;
  /** Contact mailbox from Users, if the filer has one (hire/admin). Empty for candidates. */
  email: string;
  profileType: ProfileType;
  summary: string;
  problemType: SupportProblemType;
  seriousness: SupportSeriousness;
  priority: SupportPriority;
  status: SupportStatus;
  assignee: SupportAssignee | null;
  createdAt: string;
  updatedAt: string;
};

export type SupportTicketDetail = SupportTicketListItem & {
  transcript: SupportTranscriptTurn[];
};

export function isSupportStatus(value: unknown): value is SupportStatus {
  return (
    value === "open" ||
    value === "assigned" ||
    value === "resolved" ||
    value === "closed"
  );
}

export function parseSupportStatus(value: unknown): SupportStatus | null {
  return isSupportStatus(value) ? value : null;
}
