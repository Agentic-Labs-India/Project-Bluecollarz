import { z } from "zod";
import { formatZodError } from "@/lib/utils";

export const INTERVIEW_STAGE_IDS = [
  "ai-communication",
  "ai-domain",
] as const;

export type InterviewStageId = (typeof INTERVIEW_STAGE_IDS)[number];

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
