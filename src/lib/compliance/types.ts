export const RIGHTS_REQUEST_TYPES = [
  "access",
  "correction",
  "erasure",
  "withdraw",
  "nominate",
  "grievance",
  "restriction",
  "objection",
  "portability",
] as const;

export type RightsRequestType = (typeof RIGHTS_REQUEST_TYPES)[number];

export const RIGHTS_REQUEST_STATUSES = [
  "received",
  "acknowledged",
  "in_progress",
  "resolved",
  "rejected",
] as const;

export type RightsRequestStatus = (typeof RIGHTS_REQUEST_STATUSES)[number];

export const RIGHTS_REQUEST_TYPE_LABELS: Record<RightsRequestType, string> = {
  access: "Access / export my data",
  correction: "Correction / completion",
  erasure: "Request erasure (use Delete account to erase)",
  withdraw:
    "Withdraw consent (stops interview release to employers and medical booking)",
  nominate: "Nominate someone",
  restriction: "Restrict processing",
  objection: "Object to processing",
  portability: "Data portability (JSON export)",
  grievance: "Grievance",
};

/** Mongo document on RightsRequests. */
export interface RightsRequestDocument {
  requestId: string;
  dataPrincipalId: string;
  type: RightsRequestType;
  status: RightsRequestStatus;
  details: string;
  nomineeName?: string | null;
  nomineeEmail?: string | null;
  adminNotes?: string | null;
  createdAt: Date;
  acknowledgedAt?: Date | null;
  resolvedAt?: Date | null;
  updatedAt: Date;
}

/** Wire shape from serializeRightsRequest. */
export type RightsRequestPublic = {
  requestId: string;
  type: RightsRequestType;
  status: RightsRequestStatus;
  details: string;
  nomineeName: string | null;
  nomineeEmail: string | null;
  adminNotes?: string | null;
  dataPrincipalId: string;
  createdAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  updatedAt: string;
};

export const BREACH_STATUSES = [
  "detected",
  "investigating",
  "notified",
  "closed",
] as const;

export type BreachStatus = (typeof BREACH_STATUSES)[number];

/** Mongo document on BreachIncidents. */
export interface BreachIncidentDocument {
  incidentId: string;
  title: string;
  summary: string;
  status: BreachStatus;
  affectedPrincipalIds: string[];
  notifyBoard: boolean;
  notifyPrincipals: boolean;
  boardNotifiedAt?: Date | null;
  principalsNotifiedAt?: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Wire shape from serializeBreach. */
export type BreachIncidentPublic = {
  incidentId: string;
  title: string;
  summary: string;
  status: BreachStatus;
  affectedCount: number;
  notifyBoard: boolean;
  notifyPrincipals: boolean;
  boardNotifiedAt: string | null;
  principalsNotifiedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  notificationPreview: { subject: string; body: string };
};
