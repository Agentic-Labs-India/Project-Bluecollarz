"use client";

import { memo, useState } from "react";
import { PrimaryDither } from "@/components/landing/primary-dither";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type {
  PromptKey,
  PromptSettings,
} from "@/lib/admin/platform-settings-types";

const TOKEN_RE = /\{\{([a-zA-Z0-9_]+)\}\}/g;

type PromptField = {
  key: PromptKey;
  label: string;
  placeholders: string;
  tokens: string[];
};

function tokensIn(text: string): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(TOKEN_RE)) {
    const key = match[1];
    if (key && !found.includes(key)) found.push(key);
  }
  return found;
}

const PROMPT_FIELDS: PromptField[] = (
  [
    {
      key: "help",
      label: "Help assistant",
      placeholders: "{{audience}} {{languagePrompt}}",
    },
    {
      key: "onboarding",
      label: "Onboarding coach",
      placeholders:
        "{{languagePrompt}} {{voiceDelivery}} {{voiceToolData}} {{geoPlacePrompt}}",
    },
    {
      key: "interviewCommunication",
      label: "Communication interview",
      placeholders:
        "{{jobTitle}} {{languagePrompt}} {{voiceDelivery}} {{voiceToolData}}",
    },
    {
      key: "interviewDomain",
      label: "Domain interview",
      placeholders:
        "{{jobTitle}} {{jobOverview}} {{languagePrompt}} {{voiceDelivery}} {{voiceToolData}}",
    },
    {
      key: "interviewAnalysisCommunication",
      label: "Communication scoring",
      placeholders: "{{jobTitle}} {{dialogue}}",
    },
    {
      key: "interviewAnalysisDomain",
      label: "Domain scoring",
      placeholders: "{{jobTitle}} {{jobOverview}} {{dialogue}}",
    },
    {
      key: "profileSummary",
      label: "Profile summary writer",
      placeholders: "{{facts}}",
    },
    {
      key: "jobOverview",
      label: "Job overview writer",
      placeholders: "{{brief}}",
    },
    {
      key: "resumeParse",
      label: "Resume PDF extract",
      placeholders: "Sent as the instruction with the PDF attached",
    },
    {
      key: "voiceDelivery",
      label: "Voice delivery (injected into spoken agents)",
      placeholders: "Used as {{voiceDelivery}} in onboarding and interviews",
    },
    {
      key: "knowledge",
      label: "Knowledge base Test / RAG",
      placeholders: "Grounded answers over uploaded PDFs",
    },
  ] satisfies Omit<PromptField, "tokens">[]
).map((field) => ({ ...field, tokens: tokensIn(field.placeholders) }));

const PromptCard = memo(function PromptCard({
  field,
  onOpen,
}: {
  field: PromptField;
  onOpen: (key: PromptKey) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(field.key)}
      className="bg-primary relative flex min-h-36 w-full flex-col overflow-hidden border border-white/15 p-4 text-left"
    >
      <PrimaryDither
        seed={`prompt-${field.key}`}
        opacity={0.7}
        animate={false}
      />
      <p className="relative z-10 text-sm font-semibold text-white">
        {field.label}
      </p>
      <div className="relative z-10 mt-auto pt-3">
        {field.tokens.length ? (
          <ul className="flex flex-wrap gap-1">
            {field.tokens.map((token) => (
              <li
                key={token}
                className="border border-white/25 px-1.5 py-0.5 font-mono text-[10px] text-white/90"
              >
                {`{{${token}}}`}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[11px] leading-relaxed text-white/70">
            {field.placeholders}
          </p>
        )}
      </div>
    </button>
  );
});

function PromptEditorSheet({
  field,
  value,
  defaultValue,
  onChange,
  onClose,
}: {
  field: PromptField;
  value: string;
  defaultValue: string;
  onChange: (key: PromptKey, value: string) => void;
  onClose: () => void;
}) {
  const tokens = tokensIn(`${field.placeholders}\n${value}`);

  return (
    <Sheet
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-3xl!"
      >
        <SheetHeader className="shrink-0 border-b px-4 py-4">
          <SheetTitle className="text-base">{field.label}</SheetTitle>
          <SheetDescription>{field.placeholders}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {tokens.length ? (
            <div className="space-y-1.5">
              <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                Variables
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {tokens.map((token) => (
                  <li
                    key={token}
                    className="border-border bg-muted/40 border px-1.5 py-0.5 font-mono text-[11px]"
                  >
                    {`{{${token}}}`}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <Textarea
            id={`prompt-${field.key}`}
            rows={18}
            className="min-h-72 font-mono text-xs"
            value={value}
            onChange={(e) => onChange(field.key, e.target.value)}
          />
        </div>
        <SheetFooter className="border-border shrink-0 border-t">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange(field.key, defaultValue)}
          >
            Restore default
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function AdminPromptCards({
  prompts,
  defaults,
  onChange,
}: {
  prompts: PromptSettings;
  defaults: PromptSettings;
  onChange: (key: PromptKey, value: string) => void;
}) {
  const [openKey, setOpenKey] = useState<PromptKey | null>(null);
  const open = PROMPT_FIELDS.find((field) => field.key === openKey) ?? null;

  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2">
        {PROMPT_FIELDS.map((field) => (
          <li key={field.key}>
            <PromptCard field={field} onOpen={setOpenKey} />
          </li>
        ))}
      </ul>
      {open ? (
        <PromptEditorSheet
          field={open}
          value={prompts[open.key]}
          defaultValue={defaults[open.key]}
          onChange={onChange}
          onClose={() => setOpenKey(null)}
        />
      ) : null}
    </>
  );
}
