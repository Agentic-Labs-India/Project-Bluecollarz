import type { Opportunity } from "@/lib/opportunities";

export type OpportunityCta =
  | { type: "profile" }
  | { type: "communication" }
  | { type: "domain" }
  | { type: "apply" }
  | { type: "applied" };

/** Decide the primary footer action from profile + stage progress. */
export function resolveOpportunityCta(opts: {
  opportunity: Opportunity;
  profileComplete: boolean;
  applied: boolean;
}): OpportunityCta {
  if (opts.applied) return { type: "applied" };

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
  }

  return { type: "apply" };
}
