import type { ApplicationStatus } from "@/lib/jobs/applications";
import {
  normalizeStepTemplates,
  type ApplicationStepTemplate,
} from "@/lib/jobs/stages";

export type PipelineStepStatus = "done" | "current" | "pending" | "failed";

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

function markCurrent(
  steps: CandidatePipelineStep[],
): CandidatePipelineStep[] {
  if (steps.some((step) => step.status === "failed")) return steps;
  const next = steps.findIndex((step) => step.status === "pending");
  if (next < 0) return steps;
  return steps.map((step, index) =>
    index === next ? { ...step, status: "current" } : step,
  );
}

/** Full candidate journey: job stages (if enabled) then selected → medical → offer → visa. */
export function buildCandidatePipeline(opts: {
  templates?: ApplicationStepTemplate[];
  profileComplete?: boolean;
  completedStageIds?: Iterable<string>;
  applicationStatus?: ApplicationStatus | "interviewing" | null;
}): CandidatePipelineStep[] {
  const templates = normalizeStepTemplates(opts.templates);
  const completed = new Set(opts.completedStageIds ?? []);
  const profileComplete = opts.profileComplete === true;
  const appStatus = opts.applicationStatus ?? null;
  const submitted =
    appStatus === "applied" ||
    appStatus === "selected" ||
    appStatus === "rejected";

  const pre: CandidatePipelineStep[] = templates.map((step) => {
    const done =
      submitted ||
      (step.id === "resume" && profileComplete) ||
      completed.has(step.id);
    return {
      id: step.id,
      label: step.label,
      shortLabel: PRE_APPLY_SHORT[step.id] ?? step.label,
      status: done ? "done" : "pending",
    };
  });

  let selectedStatus: PipelineStepStatus = "pending";
  if (appStatus === "rejected") selectedStatus = "failed";
  else if (appStatus === "selected") selectedStatus = "done";

  const post: CandidatePipelineStep[] = POST_APPLY_STEPS.map((step) => ({
    ...step,
    status: step.id === "selected" ? selectedStatus : "pending",
  }));

  return markCurrent([...pre, ...post]);
}
