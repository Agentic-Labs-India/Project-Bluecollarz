import type { JobListItem } from "@/lib/jobs";
import type { ProfileType } from "@/lib/user/profile-types";

export type ProvisionProfileType = Extract<ProfileType, "hire" | "admin">;

export interface AdminUserListItem {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  profileType: ProfileType;
  createdAt: string | null;
  /** True when invited but has not signed in with Google yet. */
  pending: boolean;
}

export type AdminEmailListItem = {
  id: string;
  subject: string;
  from: string;
  to: string[];
  createdAt: string | null;
  lastEvent?: string | null;
};

export type AdminEmailDetail = AdminEmailListItem & {
  html: string | null;
  text: string | null;
  cc: string[];
  bcc: string[];
  replyTo: string[];
};

/** Table row — keep the list payload light. */
export type AdminJobVerificationListItem = JobListItem & {
  ownerEmail: string | null;
  ownerName: string | null;
};

/** Sheet detail — loaded on demand. */
export type AdminJobVerificationItem = AdminJobVerificationListItem & {
  overviewHtml: string;
  locationLabel: string | null;
  countryLabel: string | null;
  stateLabel: string | null;
  stages: string[];
  customQuestions: string[];
  raRcNumber: string | null;
};
