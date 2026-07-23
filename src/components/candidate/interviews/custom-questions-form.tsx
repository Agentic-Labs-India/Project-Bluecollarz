"use client";

import { useState } from "react";
import { CheckIcon, ClipboardListIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  validateCustomAnswer,
  type CustomAnswerValue,
  type CustomQuestion,
  type CustomQuestionAnswer,
} from "@/lib/jobs/custom-questions";
import { interviewStageTitle } from "@/lib/interviews/labels";
import { cn } from "@/lib/utils";

function OptionButton({
  selected,
  onClick,
  children,
  multi,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  multi?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border-border flex w-full items-center gap-2.5 border px-3 py-2.5 text-left text-sm transition-colors",
        selected
          ? "border-primary/40 bg-primary/5"
          : "bg-background hover:bg-muted/40",
      )}
    >
      <span
        className={cn(
          "flex size-4 shrink-0 items-center justify-center border",
          multi ? "rounded-none" : "rounded-full",
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border",
        )}
      >
        {selected ? <CheckIcon className="size-2.5" strokeWidth={3} /> : null}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  );
}

export function CustomQuestionsForm({
  interviewId,
  jobTitle,
  questions,
  onComplete,
  onClose,
}: {
  interviewId: string;
  jobTitle: string;
  questions: CustomQuestion[];
  onComplete: () => void;
  onClose: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, CustomAnswerValue>>(
    () => Object.fromEntries(questions.map((q) => [q.id, null])),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const answeredCount = questions.filter((q) => {
    const v = answers[q.id];
    if (v === null || v === undefined) return false;
    if (typeof v === "string") return v.trim().length > 0;
    if (Array.isArray(v)) return v.length > 0;
    return true;
  }).length;

  const setValue = (id: string, value: CustomAnswerValue) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    setErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const toggleMulti = (id: string, option: string) => {
    const current = answers[id];
    const list = Array.isArray(current) ? [...current] : [];
    const idx = list.indexOf(option);
    if (idx >= 0) list.splice(idx, 1);
    else list.push(option);
    setValue(id, list);
  };

  const submit = async () => {
    setFormError("");
    const nextErrors: Record<string, string> = {};
    const validated: CustomQuestionAnswer[] = [];

    for (const q of questions) {
      const result = validateCustomAnswer(q, answers[q.id]);
      if (!result.ok) {
        nextErrors[q.id] = result.error;
      } else {
        validated.push({ questionId: q.id, value: result.value });
      }
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/interviews/${interviewId}/custom-answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: validated }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || "Could not submit answers");
      }
      onComplete();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-background fixed inset-0 z-50 flex flex-col">
      <header className="border-border flex shrink-0 items-center justify-between border-b px-4 py-3 md:px-6">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs uppercase tracking-wide">
            {interviewStageTitle("custom-questions")}
          </p>
          <h1 className="text-foreground truncate text-base font-semibold md:text-lg">
            {jobTitle}
          </h1>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close"
          disabled={submitting}
        >
          <XIcon className="size-4" />
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <section className="border-border flex min-h-0 flex-1 flex-col border-b md:border-r md:border-b-0">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 md:gap-5 md:p-6">
              <div className="border-border bg-card space-y-1 border p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ClipboardListIcon className="text-muted-foreground size-3.5" />
                  Hiring partner questions
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed md:text-sm">
                  Answer each question below. Fields marked with * are required.
                </p>
              </div>

              {questions.map((q, index) => {
                const invalid = Boolean(errors[q.id]);
                return (
                  <div
                    key={q.id}
                    className={cn(
                      "border-border space-y-3 border p-4",
                      invalid && "border-destructive/40 bg-destructive/5",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center text-xs font-semibold tabular-nums">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1 space-y-1">
                        <Label
                          htmlFor={`answer-${q.id}`}
                          className="text-foreground text-sm leading-snug font-medium"
                        >
                          {q.prompt}
                          {q.required ? (
                            <span className="text-destructive ml-1">*</span>
                          ) : (
                            <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                              Optional
                            </span>
                          )}
                        </Label>
                      </div>
                    </div>

                    {q.type === "text" ? (
                      <Input
                        id={`answer-${q.id}`}
                        aria-invalid={invalid || undefined}
                        placeholder="Your answer"
                        value={
                          typeof answers[q.id] === "string"
                            ? (answers[q.id] as string)
                            : ""
                        }
                        onChange={(e) => setValue(q.id, e.target.value)}
                      />
                    ) : null}

                    {q.type === "textarea" ? (
                      <Textarea
                        id={`answer-${q.id}`}
                        aria-invalid={invalid || undefined}
                        rows={4}
                        placeholder="Your answer"
                        value={
                          typeof answers[q.id] === "string"
                            ? (answers[q.id] as string)
                            : ""
                        }
                        onChange={(e) => setValue(q.id, e.target.value)}
                      />
                    ) : null}

                    {q.type === "number" ? (
                      <Input
                        id={`answer-${q.id}`}
                        type="number"
                        inputMode="decimal"
                        aria-invalid={invalid || undefined}
                        placeholder="Enter a number"
                        value={
                          typeof answers[q.id] === "number"
                            ? (answers[q.id] as number)
                            : ""
                        }
                        onChange={(e) => {
                          const raw = e.target.value;
                          setValue(q.id, raw === "" ? null : Number(raw));
                        }}
                      />
                    ) : null}

                    {q.type === "yes_no" ? (
                      <div className="grid grid-cols-2 gap-2">
                        {([true, false] as const).map((val) => (
                          <OptionButton
                            key={String(val)}
                            selected={answers[q.id] === val}
                            onClick={() => setValue(q.id, val)}
                          >
                            {val ? "Yes" : "No"}
                          </OptionButton>
                        ))}
                      </div>
                    ) : null}

                    {q.type === "single_select" ? (
                      <div className="space-y-1.5">
                        {(q.options ?? []).map((opt) => (
                          <OptionButton
                            key={opt}
                            selected={answers[q.id] === opt}
                            onClick={() => setValue(q.id, opt)}
                          >
                            {opt}
                          </OptionButton>
                        ))}
                      </div>
                    ) : null}

                    {q.type === "multi_select" ? (
                      <div className="space-y-1.5">
                        {(q.options ?? []).map((opt) => {
                          const current = answers[q.id];
                          const selected =
                            Array.isArray(current) && current.includes(opt);
                          return (
                            <OptionButton
                              key={opt}
                              multi
                              selected={selected}
                              onClick={() => toggleMulti(q.id, opt)}
                            >
                              {opt}
                            </OptionButton>
                          );
                        })}
                      </div>
                    ) : null}

                    {errors[q.id] ? (
                      <p className="text-destructive text-xs">{errors[q.id]}</p>
                    ) : null}
                  </div>
                );
              })}

              {formError ? (
                <p className="text-destructive text-sm">{formError}</p>
              ) : null}
            </div>
          </div>
        </section>

        <aside className="flex w-full shrink-0 flex-col gap-4 p-4 md:w-80 md:p-6">
          <div className="border-border bg-card space-y-3 border p-4">
            <p className="text-foreground text-sm font-semibold">Progress</p>
            <div className="bg-muted h-1.5 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-200"
                style={{
                  width: `${
                    questions.length
                      ? Math.round((answeredCount / questions.length) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
            <p className="text-muted-foreground text-xs">
              {answeredCount} of {questions.length} answered
            </p>
          </div>

          <div className="border-border space-y-2 border p-4">
            <p className="text-foreground text-sm font-semibold">Tips</p>
            <ul className="text-muted-foreground space-y-1.5 text-xs leading-snug">
              <li className="flex gap-2">
                <span className="text-foreground/40 shrink-0">•</span>
                <span>Answer honestly — hiring partners review these.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-foreground/40 shrink-0">•</span>
                <span>You can&apos;t edit after submitting.</span>
              </li>
            </ul>
          </div>

          <div className="mt-auto space-y-2">
            {formError ? (
              <p className="text-destructive text-sm md:hidden">{formError}</p>
            ) : null}
            <Button
              type="button"
              className="w-full"
              size="lg"
              disabled={submitting || questions.length === 0}
              onClick={() => void submit()}
            >
              {submitting ? "Submitting…" : "Submit answers"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={submitting}
              onClick={onClose}
            >
              Cancel
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
