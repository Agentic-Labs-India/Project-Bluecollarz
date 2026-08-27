import { z } from "zod";
import { DEFAULT_CURRENCY, isCurrencyCode } from "@/lib/core/money/currencies";
import { htmlToPlainText, sanitizeRichTextHtml } from "@/lib/core/rich-text";
import {
  type CustomQuestion,
  customQuestionsSchema,
  parseCustomQuestions,
} from "@/lib/jobs/custom-questions";
import {
  type ApplicationStep,
  OPPORTUNITY_TABS,
  type Opportunity,
  type OpportunityTab,
} from "@/lib/jobs/opportunities";
import {
  DEFAULT_PAY_TYPE,
  formatJobPay,
  JOB_PAY_TYPES,
  type JobPayType,
} from "@/lib/jobs/pay";
import {
  type ApplicationStepTemplate,
  isApplicationStageId,
  resolveStepTemplates,
  STAGE_BY_ID,
} from "@/lib/jobs/stages";
import { asNumber, formatZodError, idHex } from "@/lib/utils";

export { DEFAULT_CURRENCY } from "@/lib/core/money/currencies";
export type { CustomQuestion } from "@/lib/jobs/custom-questions";
export { parseCustomQuestions } from "@/lib/jobs/custom-questions";
export {
  DEFAULT_PAY_TYPE,
  formatJobPay,
  JOB_PAY_TYPE_LABELS,
  JOB_PAY_TYPES,
  type JobPayType,
  sanitizePayAmountInput,
} from "@/lib/jobs/pay";
export {
  APPLICATION_STAGE_OPTIONS,
  type ApplicationStageId,
  type ApplicationStepTemplate,
  isApplicationStageId,
  resolveStepTemplates,
} from "@/lib/jobs/stages";

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

/** Same tabs as candidate opportunities — single source of truth. */
export const JOB_TABS = OPPORTUNITY_TABS;

/** Stored job — ids may be ObjectId or hex string depending on write path. */
export interface JobDocument {
  _id: unknown;
  ownerId: unknown;
  title: string;
  /** Display string, e.g. `AED 5,000 / month`. */
  pay: string;
  payAmount?: number;
  payType?: JobPayType;
  payCurrency?: string;
  tab: OpportunityTab;
  overview: string;
  location?: JobLocation;
  countryCode?: string;
  stateCode?: string;
  priority?: JobPriority;
  /** Template steps — per-candidate progress lives in Applications (future) */
  applicationStepTemplates: ApplicationStepTemplate[];
  /** Screening / custom form questions for the custom-questions stage. */
  customQuestions?: CustomQuestion[];
  status: JobStatus;
  publishedAt: Date | null;
  /** MEA Recruiting Agent RC number — Model 2 binding (counsel-gated use). */
  raRcNumber?: string | null;
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
  /** Formal applications count for this role. */
  applicantCount: number;
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

export interface JobEditorForm {
  title: string;
  payAmount?: number;
  payType?: JobPayType;
  payCurrency?: string;
  tab: OpportunityTab;
  overview: string;
  location?: JobLocation;
  countryCode?: string;
  stateCode?: string;
  priority?: JobPriority;
  applicationStepTemplates: ApplicationStepTemplate[];
  customQuestions: CustomQuestion[];
  raRcNumber: string | null;
}

export interface JobEditorPayload {
  item: JobListItem;
  form: JobEditorForm;
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
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(200),
  payAmount: z.coerce
    .number({ error: "Pay is required" })
    .positive("Pay must be greater than 0")
    .max(1_000_000_000, "Pay is too large"),
  payType: z.enum(JOB_PAY_TYPES).default(DEFAULT_PAY_TYPE),
  payCurrency: z
    .string()
    .trim()
    .toUpperCase()
    .refine(isCurrencyCode, "Select a valid currency")
    .default(DEFAULT_CURRENCY),
  tab: z.enum(JOB_TABS).default("full-time"),
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
  location: z.enum(JOB_LOCATIONS).default("on-site"),
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
  applicationStepTemplates: applicationStepsSchema,
  customQuestions: customQuestionsSchema.optional(),
  /** MEA Recruiting Agent RC number — optional until Model 2 binding. */
  raRcNumber: z.preprocess((val) => {
    if (val === null || val === undefined) return null;
    const s = String(val).trim();
    return s.length ? s : null;
  }, z.string().max(64).nullable().optional()),
  publish: z.boolean().optional(),
});

export function formatJobValidationError(error: z.ZodError): string {
  return formatZodError(error);
}

/** Strip client-only fields; ownerId is never accepted from the client. */
export function sanitizeJobCreateBody(body: unknown): unknown {
  if (!body || typeof body !== "object") return body;
  const {
    ownerId: _o,
    ownerEmail: _e,
    oneClickApply: _a,
    hiredThisMonth: _h,
    pay: _pay,
    ...rest
  } = body as Record<string, unknown>;
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

export function pageBounds(
  page: number,
  limit: number,
): { page: number; limit: number; skip: number } {
  const safePage = Math.max(1, Math.trunc(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Math.trunc(limit) || 10));
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
}

export function parsePagination(
  searchParams: URLSearchParams,
  defaults: { page?: number; limit?: number } = {},
) {
  return pageBounds(
    asNumber(searchParams.get("page"), defaults.page ?? 1),
    asNumber(searchParams.get("limit"), defaults.limit ?? 10),
  );
}

export function toJobListItem(
  doc: JobDocument,
  opts?: { applicantCount?: number },
): JobListItem {
  return {
    id: idHex(doc._id),
    ownerId: idHex(doc.ownerId),
    title: doc.title,
    pay: doc.pay,
    tab: doc.tab,
    status: doc.status,
    priority: doc.priority,
    location: doc.location,
    applicantCount: opts?.applicantCount ?? 0,
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
  if (stageId === "custom-questions") {
    return "Not started — answer custom questions";
  }
  return "Not started";
}

export function templatesToApplicationSteps(
  templates: ApplicationStepTemplate[] | undefined,
  opts?: {
    profileComplete?: boolean;
    completedStageIds?: Iterable<string>;
  },
): ApplicationStep[] {
  const normalized = resolveStepTemplates(templates);
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
  const isNew =
    doc.publishedAt != null &&
    Date.now() - doc.publishedAt.getTime() < 7 * 24 * 60 * 60 * 1000;

  const templates = resolveStepTemplates(doc.applicationStepTemplates);
  const steps = templatesToApplicationSteps(templates, opts);
  const includeCustom = steps.some((s) => s.id === "custom-questions");

  return {
    id: idHex(doc._id),
    title: doc.title,
    pay: doc.pay,
    tab: doc.tab,
    overview: doc.overview,
    location: doc.location,
    countryCode: doc.countryCode,
    stateCode: doc.stateCode,
    priority: doc.priority,
    isNew: isNew || undefined,
    applicationSteps: steps,
    ...(includeCustom
      ? { customQuestions: parseCustomQuestions(doc.customQuestions) }
      : {}),
  };
}

export function buildJobDocument(
  input: JobCreateInput,
  owner: { id: string },
): Omit<JobDocument, "_id"> {
  const now = new Date();
  const publish = input.publish === true;
  const templates = resolveStepTemplates(input.applicationStepTemplates);
  const customQuestions = templates.some((s) => s.id === "custom-questions")
    ? (input.customQuestions ?? [])
    : [];
  return {
    ownerId: owner.id,
    title: input.title.trim(),
    pay: formatJobPay(input.payAmount, input.payCurrency, input.payType),
    payAmount: input.payAmount,
    payType: input.payType,
    payCurrency: input.payCurrency,
    tab: input.tab,
    overview: sanitizeRichTextHtml(input.overview),
    location: input.location,
    countryCode: input.countryCode?.trim() || undefined,
    stateCode: input.stateCode?.trim() || undefined,
    priority: input.priority,
    applicationStepTemplates: templates,
    customQuestions,
    status: publish ? "underVerification" : "draft",
    publishedAt: null,
    raRcNumber: input.raRcNumber?.trim() || null,
    createdAt: now,
    updatedAt: now,
  };
}
