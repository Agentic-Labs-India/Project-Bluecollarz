import type { InterviewStageId, InterviewStatus } from "@/lib/interviews";

const APPLICATION_STATUSES = ["applied", "selected", "rejected"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
export { APPLICATION_STATUSES };

/** A work-profile user's application to a published job. */
export interface ApplicationDocument {
  _id: unknown;
  jobId: unknown;
  applicantId: unknown;
  applicantEmail: string;
  status: ApplicationStatus;
  createdAt: Date;
}

/** Aggregate counts of a candidate's applications, for the home dashboard. */
export interface CandidateApplicationStats {
  /** Applied to a role that is still open/published. */
  active: number;
  /** Marked as selected by the hirer. */
  selected: number;
  /** Rejected, or applied to a role that has since been closed/removed. */
  closed: number;
  total: number;
}

/** Per-stage interview progress on a candidate application. */
export type CandidateInterviewStageStatus =
  | "not_started"
  | "in_progress"
  | "completed";

export interface CandidateApplicationInterviewStage {
  stageId: InterviewStageId;
  status: CandidateInterviewStageStatus;
  overall: number | null;
}

/** One application row for the candidate home dashboard. */
export interface CandidateApplicationListItem {
  id: string;
  jobId: string;
  jobTitle: string;
  jobPay: string;
  jobStatus: "published" | "draft" | "closed" | "missing";
  status: ApplicationStatus;
  appliedAt: string;
  interviews: CandidateApplicationInterviewStage[];
}

/** Compact interview scores for the applicants table. */
export interface ApplicantInterviewScore {
  stageId: InterviewStageId;
  status: InterviewStatus;
  overall: number | null;
  clarity: number | null;
  fluency: number | null;
  confidence: number | null;
  professionalism: number | null;
  completedAt?: string;
}

/** A candidate (work-profile user) who applied to a role, for the hirer view. */
export interface ApplicantListItem {
  id: string;
  applicantId: string;
  name: string | null;
  email: string;
  image: string | null;
  status: ApplicationDocument["status"];
  appliedAt: string;
  interviews: ApplicantInterviewScore[];
}

export interface PaginatedApplicantsResponse {
  job: { id: string; title: string; status: string };
  items: ApplicantListItem[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
}
