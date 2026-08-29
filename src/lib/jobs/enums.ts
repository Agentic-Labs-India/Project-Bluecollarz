export const JOB_STATUSES = [
  "draft",
  "underVerification",
  "published",
  "closed",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

/** Hire / admin display labels (DB still uses `published` for live roles). */
export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  draft: "Draft",
  underVerification: "In review",
  published: "Live",
  closed: "Closed",
};

export const JOB_PRIORITIES = ["high", "medium", "low"] as const;
export type JobPriority = (typeof JOB_PRIORITIES)[number];

export const JOB_LOCATIONS = ["remote", "on-site"] as const;
export type JobLocation = (typeof JOB_LOCATIONS)[number];

export const JOB_LOCATION_LABELS: Record<JobLocation, string> = {
  remote: "Remote",
  "on-site": "On Site",
};
