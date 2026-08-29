import type { CustomQuestion } from "@/lib/jobs/custom-questions";
import type { JobLocation, JobPriority } from "@/lib/jobs/enums";

export const OPPORTUNITY_TABS = [
  "project",
  "part-time",
  "full-time",
  "contract",
  "seasonal",
] as const;

export type OpportunityTab = (typeof OPPORTUNITY_TABS)[number];

export const OPPORTUNITY_TAB_LABELS: Record<OpportunityTab, string> = {
  project: "Project Based",
  "part-time": "Part Time",
  "full-time": "Full Time",
  contract: "Contract",
  seasonal: "Seasonal",
};

export type ApplicationStepStatus = "done" | "pending";

export interface ApplicationStep {
  id: string;
  label: string;
  status: ApplicationStepStatus;
  detail?: string;
}

export interface Opportunity {
  id: string;
  title: string;
  pay: string;
  tab: OpportunityTab;
  isNew?: boolean;
  priority?: JobPriority;
  location?: JobLocation;
  countryCode?: string;
  stateCode?: string;
  overview: string;
  applicationSteps: ApplicationStep[];
  /** Present when the role includes a custom-questions stage. */
  customQuestions?: CustomQuestion[];
}
