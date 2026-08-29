import type { HireSafeProfile } from "@/lib/compliance/arm";
import type {
  CommunicationAnalysis,
  InterviewStageId,
  InterviewStatus,
  InterviewTranscriptTurn,
} from "@/lib/interviews";
import type {
  CustomQuestion,
  CustomQuestionAnswer,
} from "@/lib/jobs/custom-questions";
import type { JobStatus } from "@/lib/jobs/enums";
import type { MedicalPipelineStatus } from "@/lib/medical/types";

const APPLICATION_STATUSES = ["applied", "selected", "rejected"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
export { APPLICATION_STATUSES };

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied: "Submitted",
  selected: "Selected",
  rejected: "Rejected",
};

export function applicationStatusLabel(status: ApplicationStatus): string {
  return APPLICATION_STATUS_LABELS[status];
}

/** A work-profile user's application to a published job. */
export interface ApplicationDocument {
  _id: unknown;
  jobId: unknown;
  applicantId: unknown;
  status: ApplicationStatus;
  createdAt: Date;
}

/** Aggregate counts of a candidate's applications, for the home dashboard. */
export interface CandidateApplicationStats {
  /** Applied or interviewing on a role that is still open/published. */
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

/** Pipeline status on the candidate home list (includes pre-apply interviewing). */
export type CandidatePipelineStatus = ApplicationStatus | "interviewing";

/** One application / interview row for the candidate home dashboard. */
export interface CandidateApplicationListItem {
  id: string;
  jobId: string;
  jobTitle: string;
  jobPay: string;
  jobStatus: JobStatus | "missing";
  status: CandidatePipelineStatus;
  /** Formal apply date, or first interview start when not yet applied. */
  appliedAt: string;
  interviews: CandidateApplicationInterviewStage[];
  /** Hirer-enabled stage ids (resume always; others optional). */
  stageIds: string[];
  /** Post-select medical fitness step, when the application is selected. */
  medicalStatus?: MedicalPipelineStatus;
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
  /** Contact is never released to employers (counsel ARM). */
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

export type ApplicantInterviewDetail = {
  id: string;
  stageId: InterviewStageId;
  status: string;
  jobTitle: string;
  analysis: CommunicationAnalysis | null;
  videoUrl: string | null;
  customQuestions: CustomQuestion[];
  customAnswers: CustomQuestionAnswer[];
  transcript: Array<Omit<InterviewTranscriptTurn, "at"> & { at: string }>;
  startedAt: string;
  completedAt: string | null;
};

export type ApplicantDetail = {
  job: { id: string; title: string };
  application: { id: string; status: ApplicationStatus; appliedAt: string };
  profile: HireSafeProfile;
  interviewRelease: boolean;
  interviews: ApplicantInterviewDetail[];
};
