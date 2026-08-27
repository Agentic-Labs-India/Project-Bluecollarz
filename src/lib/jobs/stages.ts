export interface ApplicationStepTemplate {
  id: string;
  label: string;
}

/** Canonical interview stages hirers can enable on a role. Resume is always included. */
export const APPLICATION_STAGE_OPTIONS = [
  {
    id: "resume",
    label: "Resume",
    description:
      "Always included. Candidates must complete their profile first.",
    locked: true,
  },
  {
    id: "ai-communication",
    label: "AI Interview (Communication)",
    description: "AI interview focused on communication skills.",
    locked: false,
  },
  {
    id: "ai-domain",
    label: "AI Domain Interview",
    description: "Domain skills interview with scoring.",
    locked: false,
  },
  {
    id: "custom-questions",
    label: "Custom Questions",
    description:
      "Form stage with your own questions (text, choice, number, yes/no).",
    locked: false,
  },
] as const;

export type ApplicationStageId =
  (typeof APPLICATION_STAGE_OPTIONS)[number]["id"];

export const STAGE_BY_ID = Object.fromEntries(
  APPLICATION_STAGE_OPTIONS.map((s) => [s.id, s]),
) as Record<ApplicationStageId, (typeof APPLICATION_STAGE_OPTIONS)[number]>;

export function isApplicationStageId(id: string): id is ApplicationStageId {
  return id in STAGE_BY_ID;
}

/** Resume is always first; only known optional stages may follow. */
export function resolveStepTemplates(
  templates: Array<{ id: string }> | undefined,
): ApplicationStepTemplate[] {
  const selected = new Set<ApplicationStageId>(["resume"]);
  for (const step of templates ?? []) {
    if (isApplicationStageId(step.id) && step.id !== "resume") {
      selected.add(step.id);
    }
  }

  return APPLICATION_STAGE_OPTIONS.filter((stage) =>
    selected.has(stage.id),
  ).map((stage) => ({ id: stage.id, label: stage.label }));
}
