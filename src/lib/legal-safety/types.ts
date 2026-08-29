/**
 * Serious-offence gate — the only permitted classifications.
 * The machine may open `legal_review_required`. Only a human may leave it.
 */
export const CASE_STATES = [
  "legal_review_required",
  "no_statutory_trigger",
  "mandatory_report_triggered",
] as const;

export type CaseState = (typeof CASE_STATES)[number];

/**
 * BNS s.143 elements as observations — never a conclusion that the section
 * is made out.
 */
export const S143_INDICATORS = [
  "document_retention",
  "worker_paid_fee",
  "debt_bondage_terms",
  "movement_restriction",
  "contract_substitution",
  "wage_withholding",
  "identity_misrepresentation",
  "minor_involved",
  "isolation_from_contact",
] as const;

export type S143Indicator = (typeof S143_INDICATORS)[number];

export type CaseEvidenceSourceKind =
  | "interview"
  | "chat"
  | "application"
  | "report";

export interface CaseTransition {
  from: CaseState | null;
  to: CaseState;
  actorId: string;
  actorEmail: string;
  note: string;
  at: Date;
}

/** Mongo document on LegalSafetyCases. */
export interface SeriousOffenceCase {
  caseId: string;
  state: CaseState;
  subjectUserId: string;
  indicators: S143Indicator[];
  evidence: {
    sourceKind: CaseEvidenceSourceKind;
    sourceId: string;
    excerpt: string;
    capturedAt: Date;
  }[];
  legalHoldId: string | null;
  transitions: CaseTransition[];
  createdAt: Date;
  updatedAt: Date;
}

/** Admin JSON view from toPublicCase — no Mongo `_id`. */
export type SeriousOffenceCasePublic = {
  caseId: string;
  state: CaseState;
  subjectUserId: string;
  indicators: S143Indicator[];
  legalHoldId: string | null;
  createdAt: string;
  updatedAt: string;
  evidence: {
    sourceKind: CaseEvidenceSourceKind;
    sourceId: string;
    excerpt: string;
    capturedAt: string;
  }[];
  transitions: {
    from: CaseState | null;
    to: CaseState;
    actorId: string;
    actorEmail: string;
    note: string;
    at: string;
  }[];
};
