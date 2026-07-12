import { z } from "zod";
import {
  OPPORTUNITY_TABS,
  type ApplicationStep,
  type Opportunity,
  type OpportunityTab,
} from "@/lib/opportunities";
import { asNumber, idHex, formatZodError } from "@/lib/utils";
import { htmlToPlainText, sanitizeRichTextHtml } from "@/lib/rich-text";

export const JOB_STATUSES = ["draft", "published", "closed"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_PRIORITIES = ["high", "medium", "low"] as const;
export type JobPriority = (typeof JOB_PRIORITIES)[number];

export const JOB_LOCATIONS = ["remote", "on-site"] as const;
export type JobLocation = (typeof JOB_LOCATIONS)[number];

export const JOB_LOCATION_LABELS: Record<JobLocation, string> = {
  remote: "Remote",
  "on-site": "On Site",
};

export function normalizeJobLocation(value?: string | null): JobLocation {
  const v = (value ?? "").trim().toLowerCase().replace(/\s+/g, "-");
  if (v === "on-site" || v === "onsite") return "on-site";
  return "remote";
}

/** Same tabs as candidate opportunities — single source of truth. */
export const JOB_TABS = OPPORTUNITY_TABS;

export interface ApplicationStepTemplate {
  id: string;
  label: string;
}

/** Canonical interview stages hirers can enable on a role. Resume is always included. */
export const APPLICATION_STAGE_OPTIONS = [
  {
    id: "resume",
    label: "Resume",
    description: "Always included. Candidates must complete their profile first.",
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
] as const;

export type ApplicationStageId =
  (typeof APPLICATION_STAGE_OPTIONS)[number]["id"];

const STAGE_BY_ID = Object.fromEntries(
  APPLICATION_STAGE_OPTIONS.map((s) => [s.id, s]),
) as Record<ApplicationStageId, (typeof APPLICATION_STAGE_OPTIONS)[number]>;

export function isApplicationStageId(id: string): id is ApplicationStageId {
  return id in STAGE_BY_ID;
}

/** Stored job — ids may be ObjectId or hex string depending on write path. */
export interface JobDocument {
  _id: unknown;
  ownerId: unknown;
  ownerEmail: string;
  title: string;
  pay: string;
  tab: OpportunityTab;
  overview: string;
  location?: JobLocation;
  countryCode?: string;
  stateCode?: string;
  priority?: JobPriority;
  oneClickApply?: boolean;
  /** Template steps — per-candidate progress lives in Applications (future) */
  applicationStepTemplates: ApplicationStepTemplate[];
  status: JobStatus;
  hiredThisMonth: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobListItem {
  id: string;
  ownerId: string;
  title: string;
  pay: string;
  tab: OpportunityTab;
  status: JobStatus;
  priority?: JobPriority;
  location?: string;
  hiredThisMonth: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedJobsResponse {
  items: JobListItem[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
}

const stepTemplateSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().trim().min(1).max(120),
});

const applicationStepsSchema = z.preprocess((val) => {
  if (!Array.isArray(val)) return undefined;
  const filtered: ApplicationStepTemplate[] = [];
  for (const step of val) {
    if (!step || typeof step !== "object") continue;
    const id = String((step as ApplicationStepTemplate).id ?? "").trim();
    if (!isApplicationStageId(id)) continue;
    const def = STAGE_BY_ID[id];
    filtered.push({ id: def.id, label: def.label });
  }
  return filtered.length ? filtered : undefined;
}, z.array(stepTemplateSchema).max(12).optional());

export const jobCreateSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(200),
  pay: z.string().trim().min(1, "Pay is required").max(100),
  tab: z.enum(JOB_TABS),
  overview: z
    .string()
    .max(50_000, "Overview is too long")
    .transform((value) => sanitizeRichTextHtml(value))
    .superRefine((value, ctx) => {
      const plain = htmlToPlainText(value);
      if (plain.length < 10) {
        ctx.addIssue({
          code: "custom",
          message: "Overview must be at least 10 characters",
        });
      }
      if (plain.length > 8_000) {
        ctx.addIssue({
          code: "custom",
          message: "Overview text is too long",
        });
      }
    }),
  location: z.enum(JOB_LOCATIONS).default("remote"),
  countryCode: z.preprocess((val) => {
    if (val === null || val === undefined) return null;
    const s = String(val).trim();
    return s.length ? s : null;
  }, z.string().max(8).nullable().optional()),
  stateCode: z.preprocess((val) => {
    if (val === null || val === undefined) return null;
    const s = String(val).trim();
    return s.length ? s : null;
  }, z.string().max(16).nullable().optional()),
  priority: z.enum(JOB_PRIORITIES).optional(),
  oneClickApply: z.boolean().optional(),
  applicationStepTemplates: applicationStepsSchema,
  publish: z.boolean().optional(),
});

export function formatJobValidationError(error: z.ZodError): string {
  return formatZodError(error);
}

/** Strip client-only fields; ownerId is never accepted from the client. */
export function sanitizeJobCreateBody(body: unknown): unknown {
  if (!body || typeof body !== "object") return body;
  const { ownerId: _o, ownerEmail: _e, ...rest } = body as Record<string, unknown>;
  return rest;
}

export const jobUpdateSchema = jobCreateSchema
  .partial()
  .extend({
    status: z.enum(JOB_STATUSES).optional(),
    action: z.enum(["publish", "close", "reopen"]).optional(),
  })
  .refine(
    (data) =>
      data.action !== undefined ||
      Object.keys(data).some(
        (k) => k !== "action" && data[k as keyof typeof data] !== undefined,
      ),
    { message: "At least one field or action is required" },
  );

export type JobCreateInput = z.infer<typeof jobCreateSchema>;

export const DEFAULT_APPLICATION_STEP_TEMPLATES: ApplicationStepTemplate[] = [
  { id: "resume", label: "Resume" },
];

export function parsePagination(
  searchParams: URLSearchParams,
  defaults: { page?: number; limit?: number } = {},
) {
  const page = Math.max(1, asNumber(searchParams.get("page"), defaults.page ?? 1));
  const limit = Math.min(
    50,
    Math.max(1, asNumber(searchParams.get("limit"), defaults.limit ?? 10)),
  );
  return { page, limit, skip: (page - 1) * limit };
}

/** Resume is always first; only known optional stages may follow. */
export function normalizeStepTemplates(
  templates: ApplicationStepTemplate[] | undefined,
): ApplicationStepTemplate[] {
  const selected = new Set<ApplicationStageId>(["resume"]);
  for (const step of templates ?? []) {
    const id = String(step.id ?? "").trim();
    if (isApplicationStageId(id) && id !== "resume") selected.add(id);
  }

  return APPLICATION_STAGE_OPTIONS.filter((stage) => selected.has(stage.id)).map(
    (stage) => ({ id: stage.id, label: stage.label }),
  );
}

export function toJobListItem(doc: JobDocument): JobListItem {
  return {
    id: idHex(doc._id),
    ownerId: idHex(doc.ownerId),
    title: doc.title,
    pay: doc.pay,
    tab: doc.tab,
    status: doc.status,
    priority: doc.priority,
    location: doc.location ? normalizeJobLocation(doc.location) : undefined,
    hiredThisMonth: asNumber(doc.hiredThisMonth, 0),
    publishedAt: doc.publishedAt?.toISOString() ?? null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function stageDetail(
  stageId: string,
  status: ApplicationStep["status"],
  profileComplete: boolean,
): string {
  if (stageId === "resume") {
    if (status === "done") return "Profile complete";
    return profileComplete
      ? "Ready"
      : "Complete your profile to unlock this step";
  }
  if (status === "done") return "Completed";
  if (stageId === "ai-communication") {
    return "Not started — AI communication interview";
  }
  if (stageId === "ai-domain") return "Not started — AI domain interview";
  return "Not started";
}

export function templatesToApplicationSteps(
  templates: ApplicationStepTemplate[] | undefined,
  opts?: {
    profileComplete?: boolean;
    completedStageIds?: Iterable<string>;
  },
): ApplicationStep[] {
  const normalized = normalizeStepTemplates(templates);
  const profileComplete = opts?.profileComplete === true;
  const completed = new Set(opts?.completedStageIds ?? []);

  return normalized.map((step) => {
    let status: ApplicationStep["status"] = "pending";
    if (step.id === "resume" && profileComplete) status = "done";
    if (completed.has(step.id)) status = "done";
    return {
      id: step.id,
      label: step.label,
      status,
      detail: stageDetail(step.id, status, profileComplete),
    };
  });
}

export function toOpportunity(
  doc: JobDocument,
  opts?: {
    profileComplete?: boolean;
    completedStageIds?: Iterable<string>;
  },
): Opportunity {
  const hiredThisMonth = asNumber(doc.hiredThisMonth, 0);
  const isNew =
    doc.publishedAt != null &&
    Date.now() - doc.publishedAt.getTime() < 7 * 24 * 60 * 60 * 1000;

  return {
    id: idHex(doc._id),
    title: doc.title,
    pay: doc.pay,
    tab: doc.tab,
    overview: doc.overview,
    location: doc.location ? normalizeJobLocation(doc.location) : undefined,
    countryCode: doc.countryCode,
    stateCode: doc.stateCode,
    priority: doc.priority,
    hiredThisMonth: hiredThisMonth > 0 ? hiredThisMonth : undefined,
    isNew: isNew || undefined,
    applicationSteps: templatesToApplicationSteps(
      doc.applicationStepTemplates,
      opts,
    ),
  };
}

export function buildJobDocument(
  input: JobCreateInput,
  owner: { id: string; email: string },
): Omit<JobDocument, "_id"> {
  const now = new Date();
  const publish = input.publish === true;
  return {
    ownerId: owner.id,
    ownerEmail: owner.email.toLowerCase(),
    title: input.title.trim(),
    pay: input.pay.trim(),
    tab: input.tab,
    overview: sanitizeRichTextHtml(input.overview),
    location: normalizeJobLocation(input.location),
    countryCode: input.countryCode?.trim() || undefined,
    stateCode: input.stateCode?.trim() || undefined,
    priority: input.priority,
    oneClickApply: false,
    applicationStepTemplates: normalizeStepTemplates(input.applicationStepTemplates),
    status: publish ? "published" : "draft",
    hiredThisMonth: 0,
    publishedAt: publish ? now : null,
    createdAt: now,
    updatedAt: now,
  };
}

