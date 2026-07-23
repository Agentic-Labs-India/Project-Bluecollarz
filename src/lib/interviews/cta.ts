import type { ApplicationStatus } from "@/lib/jobs/applications";
import type { Opportunity } from "@/lib/opportunities";

export type OpportunityCta =
  | { type: "profile" }
  | { type: "communication" }
  | { type: "domain" }
  | { type: "custom_questions" }
  | { type: "apply" }
  | { type: "applied" }
  | { type: "rejected" }
  | { type: "selected" }
  | { type: "kyc_complete" };

/** Decide the primary footer action from profile + stage progress + application status. */
export function resolveOpportunityCta(opts: {
  opportunity: Opportunity;
  profileComplete: boolean;
  applicationStatus?: ApplicationStatus | null;
  kycVerified?: boolean;
}): OpportunityCta {
  if (opts.applicationStatus === "rejected") return { type: "rejected" };
  if (opts.applicationStatus === "selected") {
    return opts.kycVerified ? { type: "kyc_complete" } : { type: "selected" };
  }
  if (opts.applicationStatus === "applied") return { type: "applied" };

  const steps = opts.opportunity.applicationSteps;
  const resumeDone =
    opts.profileComplete ||
    steps.some((s) => s.id === "resume" && s.status === "done");
  if (!resumeDone) return { type: "profile" };

  for (const step of steps) {
    if (step.id === "resume") continue;
    if (step.status === "done") continue;
    if (step.id === "ai-communication") return { type: "communication" };
    if (step.id === "ai-domain") return { type: "domain" };
    if (step.id === "custom-questions") return { type: "custom_questions" };
  }

  return { type: "apply" };
}
