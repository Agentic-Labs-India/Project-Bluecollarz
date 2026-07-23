import { z } from "zod";

export const CUSTOM_QUESTION_TYPES = [
  "text",
  "textarea",
  "number",
  "single_select",
  "multi_select",
  "yes_no",
] as const;

export type CustomQuestionType = (typeof CUSTOM_QUESTION_TYPES)[number];

export const CUSTOM_QUESTION_TYPE_LABELS: Record<CustomQuestionType, string> = {
  text: "Short text",
  textarea: "Long text",
  number: "Number",
  single_select: "Single choice",
  multi_select: "Multiple choice",
  yes_no: "Yes / No",
};

/** Question definition owned by a job (and snapshotted onto interviews). */
export interface CustomQuestion {
  id: string;
  prompt: string;
  type: CustomQuestionType;
  required: boolean;
  /** Present only for single_select / multi_select */
  options?: string[];
}

export type CustomAnswerValue = string | string[] | number | boolean | null;

/** Structured answer row keyed by question id. */
export interface CustomQuestionAnswer {
  questionId: string;
  value: CustomAnswerValue;
}

const optionSchema = z.string().trim().min(1).max(200);

const customQuestionSchema = z
  .object({
    id: z.string().trim().min(1).max(64),
    prompt: z.string().trim().min(1, "Question is required").max(500),
    type: z.enum(CUSTOM_QUESTION_TYPES),
    required: z.boolean(),
    options: z.array(optionSchema).max(20).optional(),
  })
  .superRefine((q, ctx) => {
    if (q.type === "single_select" || q.type === "multi_select") {
      const opts = (q.options ?? []).map((o) => o.trim()).filter(Boolean);
      if (opts.length < 2) {
        ctx.addIssue({
          code: "custom",
          message: "Add at least two options for choice questions",
          path: ["options"],
        });
      }
    }
  });

function toCustomQuestion(
  q: z.infer<typeof customQuestionSchema>,
): CustomQuestion {
  const needsOptions =
    q.type === "single_select" || q.type === "multi_select";
  return {
    id: q.id,
    prompt: q.prompt.trim(),
    type: q.type,
    required: q.required,
    ...(needsOptions
      ? {
          options: (q.options ?? [])
            .map((o) => o.trim())
            .filter(Boolean)
            .slice(0, 20),
        }
      : {}),
  };
}

/** Strict write schema — rejects invalid / duplicate ids. */
export const customQuestionsSchema = z
  .array(customQuestionSchema)
  .max(30)
  .superRefine((questions, ctx) => {
    const seen = new Set<string>();
    for (let i = 0; i < questions.length; i++) {
      const id = questions[i]?.id;
      if (!id) continue;
      if (seen.has(id)) {
        ctx.addIssue({
          code: "custom",
          message: "Duplicate question id",
          path: [i, "id"],
        });
      }
      seen.add(id);
    }
  })
  .transform((questions) => questions.map(toCustomQuestion));

/**
 * Soft read/normalize for stored docs — drops invalid rows.
 * Use `customQuestionsSchema` on write boundaries.
 */
export function normalizeCustomQuestions(value: unknown): CustomQuestion[] {
  if (!Array.isArray(value)) return [];
  const out: CustomQuestion[] = [];
  const seen = new Set<string>();
  for (const raw of value) {
    const parsed = customQuestionSchema.safeParse(raw);
    if (!parsed.success) continue;
    if (seen.has(parsed.data.id)) continue;
    seen.add(parsed.data.id);
    out.push(toCustomQuestion(parsed.data));
  }
  return out;
}

export function emptyCustomQuestion(): CustomQuestion {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    prompt: "",
    type: "text",
    required: true,
  };
}

/** Validate one answer against a frozen question definition. */
export function validateCustomAnswer(
  question: CustomQuestion,
  value: unknown,
): { ok: true; value: CustomAnswerValue } | { ok: false; error: string } {
  const empty =
    value === null ||
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0);

  if (empty) {
    if (question.required) {
      return { ok: false, error: "This question is required" };
    }
    return { ok: true, value: null };
  }

  switch (question.type) {
    case "text":
    case "textarea": {
      if (typeof value !== "string") {
        return { ok: false, error: "Expected text" };
      }
      const trimmed = value.trim();
      if (!trimmed && question.required) {
        return { ok: false, error: "This question is required" };
      }
      if (trimmed.length > 4000) {
        return { ok: false, error: "Answer is too long" };
      }
      return { ok: true, value: trimmed || null };
    }
    case "number": {
      const n = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(n)) {
        return { ok: false, error: "Expected a number" };
      }
      return { ok: true, value: n };
    }
    case "yes_no": {
      if (typeof value === "boolean") return { ok: true, value };
      if (value === "yes" || value === "true") return { ok: true, value: true };
      if (value === "no" || value === "false") return { ok: true, value: false };
      return { ok: false, error: "Expected yes or no" };
    }
    case "single_select": {
      if (typeof value !== "string") {
        return { ok: false, error: "Pick one option" };
      }
      if (!(question.options ?? []).includes(value)) {
        return { ok: false, error: "Invalid option" };
      }
      return { ok: true, value };
    }
    case "multi_select": {
      if (!Array.isArray(value)) {
        return { ok: false, error: "Pick one or more options" };
      }
      const opts = new Set(question.options ?? []);
      const picked = value.map(String).filter((v) => opts.has(v));
      if (question.required && picked.length === 0) {
        return { ok: false, error: "Pick at least one option" };
      }
      return { ok: true, value: picked };
    }
    default:
      return { ok: false, error: "Unknown question type" };
  }
}

export function formatCustomAnswerDisplay(value: CustomAnswerValue): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  return String(value);
}
