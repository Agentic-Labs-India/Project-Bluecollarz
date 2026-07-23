"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CUSTOM_QUESTION_TYPES,
  CUSTOM_QUESTION_TYPE_LABELS,
  emptyCustomQuestion,
  type CustomQuestion,
  type CustomQuestionType,
} from "@/lib/jobs/custom-questions";
import { PlusIcon, Trash2Icon } from "lucide-react";

export function CustomQuestionsBuilder({
  questions,
  onChange,
  disabled,
}: {
  questions: CustomQuestion[];
  onChange: (next: CustomQuestion[]) => void;
  disabled?: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(
    () => questions[0]?.id ?? null,
  );

  const update = (id: string, patch: Partial<CustomQuestion>) => {
    onChange(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  };

  const remove = (id: string) => {
    const next = questions.filter((q) => q.id !== id);
    onChange(next);
    if (openId === id) {
      setOpenId(next[0]?.id ?? null);
    }
  };

  const addQuestion = () => {
    const q = emptyCustomQuestion();
    onChange([...questions, q]);
    setOpenId(q.id);
  };

  const addOption = (id: string) => {
    onChange(
      questions.map((q) =>
        q.id === id ? { ...q, options: [...(q.options ?? []), ""] } : q,
      ),
    );
  };

  const setOption = (id: string, index: number, value: string) => {
    onChange(
      questions.map((q) => {
        if (q.id !== id) return q;
        const options = [...(q.options ?? [])];
        options[index] = value;
        return { ...q, options };
      }),
    );
  };

  const removeOption = (id: string, index: number) => {
    onChange(
      questions.map((q) => {
        if (q.id !== id) return q;
        return {
          ...q,
          options: (q.options ?? []).filter((_, i) => i !== index),
        };
      }),
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-foreground text-sm font-medium">Questions</h4>
          <p className="text-muted-foreground text-xs">
            Candidates fill these before they can apply.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled || questions.length >= 30}
          onClick={addQuestion}
        >
          <PlusIcon className="size-3.5" />
          Add question
        </Button>
      </div>

      {questions.length === 0 ? (
        <p className="text-muted-foreground border-border border border-dashed px-4 py-6 text-center text-xs">
          No questions yet. Add at least one for this stage.
        </p>
      ) : (
        <Accordion
          type="single"
          value={openId ? [openId] : []}
          onValueChange={(next) => setOpenId(next[0] ?? null)}
          className="border-border border"
        >
          {questions.map((q, index) => {
            const needsOptions =
              q.type === "single_select" || q.type === "multi_select";
            const title =
              q.prompt.trim() ||
              `Question ${index + 1} · ${CUSTOM_QUESTION_TYPE_LABELS[q.type]}`;

            return (
              <AccordionItem key={q.id} value={q.id} className="px-4">
                <AccordionTrigger className="gap-2 hover:no-underline">
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="text-muted-foreground shrink-0 text-xs font-medium tabular-nums">
                      {index + 1}.
                    </span>
                    <span className="truncate">{title}</span>
                    {q.required ? (
                      <span className="text-destructive shrink-0 text-xs">
                        *
                      </span>
                    ) : null}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-foreground space-y-3">
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={disabled}
                      className="text-destructive h-7 px-2"
                      onClick={() => remove(q.id)}
                    >
                      <Trash2Icon className="size-3.5" />
                      Remove
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`q-prompt-${q.id}`}>Prompt</Label>
                    <Textarea
                      id={`q-prompt-${q.id}`}
                      value={q.prompt}
                      disabled={disabled}
                      rows={2}
                      placeholder="e.g. How many years have you worked with HVAC systems?"
                      onChange={(e) =>
                        update(q.id, { prompt: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={q.type}
                        disabled={disabled}
                        onValueChange={(value) => {
                          const type = value as CustomQuestionType;
                          update(q.id, {
                            type,
                            options:
                              type === "single_select" ||
                              type === "multi_select"
                                ? q.options?.length
                                  ? q.options
                                  : ["", ""]
                                : [],
                          });
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CUSTOM_QUESTION_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {CUSTOM_QUESTION_TYPE_LABELS[type]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-end justify-between gap-3 pb-1">
                      <div>
                        <p className="text-foreground text-sm font-medium">
                          Required
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Candidate must answer
                        </p>
                      </div>
                      <Switch
                        checked={q.required}
                        disabled={disabled}
                        onCheckedChange={(checked) =>
                          update(q.id, { required: checked })
                        }
                      />
                    </div>
                  </div>

                  {needsOptions ? (
                    <div className="space-y-2">
                      <Label>Options</Label>
                      <div className="space-y-2">
                        {(q.options ?? []).map((opt, optIndex) => (
                          <div key={optIndex} className="flex gap-2">
                            <Input
                              value={opt}
                              disabled={disabled}
                              placeholder={`Option ${optIndex + 1}`}
                              onChange={(e) =>
                                setOption(q.id, optIndex, e.target.value)
                              }
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={
                                disabled || (q.options?.length ?? 0) <= 2
                              }
                              onClick={() => removeOption(q.id, optIndex)}
                            >
                              <Trash2Icon className="size-3.5" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={disabled || (q.options?.length ?? 0) >= 20}
                          onClick={() => addOption(q.id)}
                        >
                          <PlusIcon className="size-3.5" />
                          Add option
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
