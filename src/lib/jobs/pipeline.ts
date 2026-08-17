import type { ApplicationStatus } from "@/lib/jobs/applications";
import {
  APPLICATION_STAGE_OPTIONS,
  isApplicationStageId,
} from "@/lib/jobs/stages";
import type { MedicalPipelineStatus } from "@/lib/medical/types";

export type PipelineStepStatus =
  | "done"
  | "current"
  | "pending"
  | "failed"
  | "skipped";

export interface CandidatePipelineStep {
  id: string;
  label: string;
  shortLabel: string;
  status: PipelineStepStatus;
}

const PRE_APPLY_SHORT: Record<string, string> = {
  resume: "Resume",
  "ai-communication": "Comm",
  "ai-domain": "Domain",
  "custom-questions": "Qs",
};

const POST_APPLY_STEPS: Omit<CandidatePipelineStep, "status">[] = [
  { id: "selected", label: "Selected", shortLabel: "Select" },
  { id: "medical", label: "Medical fitness", shortLabel: "Med" },
  { id: "offer", label: "Offer letter", shortLabel: "Offer" },
  { id: "visa", label: "Visa", shortLabel: "Visa" },
];

function markCurrent(steps: CandidatePipelineStep[]): CandidatePipelineStep[] {
  if (steps.some((step) => step.status === "failed")) return steps;
  const next = steps.findIndex((step) => step.status === "pending");
  if (next < 0) return steps;
  return steps.map((step, index) =>
    index === next ? { ...step, status: "current" } : step,
  );
}

export function buildCandidatePipeline(opts: {
  stageIds?: Iterable<string>;
  profileComplete?: boolean;
  completedStageIds?: Iterable<string>;
  applicationStatus?: ApplicationStatus | "interviewing" | null;
  medicalStatus?: MedicalPipelineStatus | null;
}): CandidatePipelineStep[] {
  const enabled = new Set<string>(["resume"]);
  for (const id of opts.stageIds ?? []) {
    if (isApplicationStageId(id)) enabled.add(id);
  }
  const completed = new Set(opts.completedStageIds ?? []);
  const submitted =
    opts.applicationStatus === "applied" ||
    opts.applicationStatus === "selected" ||
    opts.applicationStatus === "rejected";

  const pre: CandidatePipelineStep[] = APPLICATION_STAGE_OPTIONS.map(
    (stage) => ({
      id: stage.id,
      label: stage.label,
      shortLabel: PRE_APPLY_SHORT[stage.id],
      status: !enabled.has(stage.id)
        ? "skipped"
        : submitted ||
            (stage.id === "resume" && opts.profileComplete) ||
            completed.has(stage.id)
          ? "done"
          : "pending",
    }),
  );

  const selectedStatus: PipelineStepStatus =
    opts.applicationStatus === "rejected"
      ? "failed"
      : opts.applicationStatus === "selected"
        ? "done"
        : "pending";

  const post: CandidatePipelineStep[] = POST_APPLY_STEPS.map((step) => {
    if (step.id === "selected") {
      return { ...step, status: selectedStatus };
    }
    if (step.id === "medical") {
      if (selectedStatus !== "done") return { ...step, status: "pending" };
      if (opts.medicalStatus === "completed") {
        return { ...step, status: "done" };
      }
      if (opts.medicalStatus === "failed") {
        return { ...step, status: "failed" };
      }
      return { ...step, status: "pending" };
    }
    return { ...step, status: "pending" };
  });

  if (!submitted) return [...markCurrent(pre), ...post];
  return markCurrent([...pre, ...post]);
}
