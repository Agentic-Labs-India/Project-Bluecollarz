import { z } from "zod";
import { formatZodError } from "@/lib/utils";
import type {
  CustomQuestion,
  CustomQuestionAnswer,
} from "@/lib/jobs/custom-questions";

export const INTERVIEW_STAGE_IDS = [
  "ai-communication",
  "ai-domain",
  "custom-questions",
] as const;

export type InterviewStageId = (typeof INTERVIEW_STAGE_IDS)[number];

export const AI_INTERVIEW_STAGE_IDS = [
  "ai-communication",
  "ai-domain",
] as const;

export type AiInterviewStageId = (typeof AI_INTERVIEW_STAGE_IDS)[number];

const AI_STAGE_SET = new Set<string>(AI_INTERVIEW_STAGE_IDS);

export function isAiInterviewStage(
  stageId: string,
): stageId is AiInterviewStageId {
  return AI_STAGE_SET.has(stageId);
}

export function isCustomQuestionsStage(
  stageId: string,
): stageId is "custom-questions" {
  return stageId === "custom-questions";
}

export const INTERVIEW_STATUSES = ["in_progress", "completed"] as const;

export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];

export interface InterviewTranscriptTurn {
  role: "assistant" | "user";
  text: string;
  at: Date;
}

export interface CommunicationAnalysis {
  clarity: number;
  fluency: number;
  confidence: number;
  professionalism: number;
  overall: number;
  summary: string;
  strengths: string[];
  improvements: string[];
}

export interface InterviewDocument {
  _id: unknown;
  jobId: string;
  applicantId: string;
  applicantEmail: string;
  stageId: InterviewStageId;
  status: InterviewStatus;
  jobTitle: string;
  /** Snapshot of job.overview for domain interview prompts. */
  jobOverview?: string;
  transcript: InterviewTranscriptTurn[];
  analysis?: CommunicationAnalysis;
  /**
   * Frozen question defs for custom-questions (copied from the job at start).
   * Hire UI and answer validation must use this snapshot, not live job config.
   */
  customQuestions?: CustomQuestion[];
  /** Structured answers keyed by questionId. */
  customAnswers?: CustomQuestionAnswer[];
  videoUrl?: string;
  startedAt: Date;
  completedAt?: Date;
  updatedAt: Date;
}

export const interviewStartSchema = z.object({
  jobId: z.string().trim().min(1),
  stageId: z.enum(INTERVIEW_STAGE_IDS),
});

export function formatInterviewError(error: z.ZodError): string {
  return formatZodError(error);
}
