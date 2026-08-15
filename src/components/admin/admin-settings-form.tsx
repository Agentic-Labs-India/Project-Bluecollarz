"use client";

import { useEffect, useRef, useState } from "react";
import { CircleHelpIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminAiFlow } from "@/components/admin/admin-ai-flow";
import {
  PROMPT_KEYS,
  type LlmTemperatureKey,
  type PlatformSettingsPublic,
  type PromptKey,
} from "@/lib/admin/platform-settings-types";
import { VOICE_LANGUAGE_OPTIONS } from "@/lib/ai/voice/languages";
import {
  SARVAM_STT_MODES,
  SARVAM_STT_MODELS,
  SARVAM_TTS_BITRATES,
  SARVAM_TTS_CODECS,
  SARVAM_TTS_MODELS,
  defaultSpeakerForTtsModel,
  speakersForTtsModel,
  ttsPaceRange,
} from "@/lib/ai/voice/sarvam-options";

const SAVE_DEBOUNCE_MS = 800;

const LLM_TEMP_HELP =
  "Lower (toward 0): more focused, repeatable answers. Higher (toward 2): more varied, less predictable wording. Keep scoring low so marks stay consistent.";

const TTS_TEMP_HELP =
  "Lower: calmer, steadier voice with less pitch swing. Higher: more expressive and less consistent. Keep low so every spoken reply sounds the same.";

const TTS_PACE_HELP =
  "Lower: slower speech. Higher: faster speech. 1 is the default speaking rate.";

const TEMP_FIELDS: { key: LlmTemperatureKey; label: string }[] = [
  { key: "help", label: "Help chat" },
  { key: "onboarding", label: "Onboarding coach" },
  { key: "interview", label: "AI interviews" },
  { key: "analysis", label: "Interview scoring" },
  { key: "jobOverview", label: "Job overview writer" },
  { key: "profileSummary", label: "Profile summary" },
  { key: "resumeParse", label: "Resume extract" },
];

const PROMPT_FIELDS: { key: PromptKey; label: string; placeholders: string }[] =
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
  ];

function payloadOf(settings: PlatformSettingsPublic) {
  return {
    grievanceOfficer: settings.grievanceOfficer,
    llm: settings.llm,
    voice: settings.voice,
    prompts: settings.prompts,
  };
}

function isSavable(settings: PlatformSettingsPublic): boolean {
  if (!settings.llm.model.trim()) return false;
  return PROMPT_KEYS.every((key) => settings.prompts[key].trim().length >= 20);
}

function HelpTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        className="text-muted-foreground hover:text-foreground inline-flex size-5 items-center justify-center"
        aria-label="What this control does"
      >
        <CircleHelpIcon className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-left leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function titleCase(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function SettingSelect({
  id,
  value,
  options,
  labels,
  onValueChange,
}: {
  id: string;
  value: string;
  options: readonly string[];
  labels?: Record<string, string>;
  onValueChange: (value: string) => void;
}) {
  const items = options.includes(value) ? options : [value, ...options];
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((option) => (
          <SelectItem key={option} value={option}>
            {labels?.[option] ?? titleCase(option)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Field({
  id,
  label,
  hint,
  help,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={id}>{label}</Label>
        {help ? <HelpTip text={help} /> : null}
      </div>
      {children}
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </div>
  );
}

function TempSlider({
  id,
  label,
  value,
  min,
  max,
  step,
  help,
  lowLabel,
  highLabel,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  help: string;
  lowLabel: string;
  highLabel: string;
  onChange: (next: number) => void;
}) {
  return (
    <Field id={id} label={label} help={help}>
      <div className="flex items-center gap-3">
        <Slider
          id={id}
          min={min}
          max={max}
          step={step}
          value={[value]}
          onValueChange={([next]) => {
            if (typeof next === "number" && Number.isFinite(next)) onChange(next);
          }}
          className="flex-1"
        />
        <span className="text-foreground w-10 shrink-0 text-right font-mono text-xs tabular-nums">
          {value.toFixed(2)}
        </span>
      </div>
      <p className="text-muted-foreground flex justify-between text-[11px]">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </p>
    </Field>
  );
}

export function AdminSettingsForm({
  initial,
  defaults,
}: {
  initial: PlatformSettingsPublic;
  defaults: PlatformSettingsPublic;
  onSaved?: (settings: PlatformSettingsPublic) => void;
}) {
  const [form, setForm] = useState<PlatformSettingsPublic>(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = useState("");
  const formRef = useRef(form);
  formRef.current = form;
  const lastSent = useRef(JSON.stringify(payloadOf(initial)));
  const abortRef = useRef<AbortController | null>(null);
  const saveGen = useRef(0);

  useEffect(() => {
    const payload = payloadOf(form);
    const serialized = JSON.stringify(payload);
    if (serialized === lastSent.current) return;
    if (!isSavable(form)) {
      setStatus("idle");
      setError("Prompts must stay at least 20 characters to save.");
      return;
    }

    setError("");
    const handle = window.setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const gen = ++saveGen.current;
      const body = JSON.stringify(payloadOf(formRef.current));
      setStatus("saving");
      void fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body,
        signal: controller.signal,
      })
        .then(async (res) => {
          const json = (await res.json().catch(() => ({}))) as {
            settings?: PlatformSettingsPublic;
            error?: string;
          };
          if (gen !== saveGen.current) return;
          if (!res.ok || !json.settings) {
            throw new Error(json.error || "Save failed");
          }
          lastSent.current = body;
          setForm((prev) => ({
            ...prev,
            updatedAt: json.settings!.updatedAt,
            updatedBy: json.settings!.updatedBy,
          }));
          setStatus("saved");
          setError("");
        })
        .catch((e: unknown) => {
          if (gen !== saveGen.current) return;
          if (e instanceof DOMException && e.name === "AbortError") return;
          setStatus("error");
          setError(e instanceof Error ? e.message : "Save failed");
        });
    }, SAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [form]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-muted-foreground text-xs">
          {status === "saving"
            ? "Saving…"
            : status === "saved"
              ? "Saved. New AI and voice requests use these values."
              : form.updatedAt
                ? `Last saved ${new Date(form.updatedAt).toLocaleString()}`
                : "Using defaults. Edits save automatically."}
        </p>
      </div>
      {status === "error" && error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : null}

      <section className="border-border space-y-4 border p-4">
        <h2 className="text-foreground text-sm font-medium">Grievance Officer</h2>
        <p className="text-muted-foreground text-xs">
          Shown on /grievance. Name, phone, and postal address are required to
          leave interim status. Do not invent a person.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="go-name" label="Name">
            <Input
              id="go-name"
              value={form.grievanceOfficer.name}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  grievanceOfficer: { ...p.grievanceOfficer, name: e.target.value },
                }))
              }
            />
          </Field>
          <Field id="go-email" label="Email">
            <Input
              id="go-email"
              type="email"
              value={form.grievanceOfficer.email}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  grievanceOfficer: {
                    ...p.grievanceOfficer,
                    email: e.target.value,
                  },
                }))
              }
            />
          </Field>
          <Field id="go-phone" label="Phone">
            <Input
              id="go-phone"
              value={form.grievanceOfficer.phone}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  grievanceOfficer: {
                    ...p.grievanceOfficer,
                    phone: e.target.value,
                  },
                }))
              }
            />
          </Field>
          <Field id="go-languages" label="Languages">
            <Input
              id="go-languages"
              value={form.grievanceOfficer.languages}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  grievanceOfficer: {
                    ...p.grievanceOfficer,
                    languages: e.target.value,
                  },
                }))
              }
              placeholder="Hindi,English"
            />
          </Field>
        </div>
        <Field id="go-address" label="Postal address">
          <Textarea
            id="go-address"
            rows={3}
            value={form.grievanceOfficer.address}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                grievanceOfficer: {
                  ...p.grievanceOfficer,
                  address: e.target.value,
                },
              }))
            }
          />
        </Field>
      </section>

      <section className="border-border space-y-4 border p-4">
        <h2 className="text-foreground text-sm font-medium">Language model</h2>
        <Field
          id="llm-model"
          label="Gateway model id"
          hint="Vercel AI Gateway id, e.g. openai/gpt-4o"
        >
          <Input
            id="llm-model"
            value={form.llm.model}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                llm: { ...p.llm, model: e.target.value },
              }))
            }
          />
        </Field>
        <div className="grid gap-6 sm:grid-cols-2">
          {TEMP_FIELDS.map((field) => (
            <TempSlider
              key={field.key}
              id={`temp-${field.key}`}
              label={`${field.label} temperature`}
              value={form.llm.temperatures[field.key]}
              min={0}
              max={2}
              step={0.05}
              help={LLM_TEMP_HELP}
              lowLabel="Focused"
              highLabel="Varied"
              onChange={(next) =>
                setForm((p) => ({
                  ...p,
                  llm: {
                    ...p.llm,
                    temperatures: {
                      ...p.llm.temperatures,
                      [field.key]: next,
                    },
                  },
                }))
              }
            />
          ))}
        </div>
      </section>

      <section className="border-border space-y-4 border p-4">
        <h2 className="text-foreground text-sm font-medium">Voice (Sarvam)</h2>
        <p className="text-muted-foreground text-xs">
          Options match Sarvam TTS (Bulbul) and STT (Saaras) docs. Speakers
          change with the TTS model.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="tts-model" label="TTS model">
            <SettingSelect
              id="tts-model"
              value={form.voice.ttsModel}
              options={SARVAM_TTS_MODELS}
              labels={{
                "bulbul:v3": "bulbul:v3 (recommended)",
                "bulbul:v2": "bulbul:v2 (legacy)",
              }}
              onValueChange={(model) =>
                setForm((p) => {
                  const speakers = speakersForTtsModel(model);
                  const speaker = speakers.includes(p.voice.ttsSpeaker)
                    ? p.voice.ttsSpeaker
                    : defaultSpeakerForTtsModel(model);
                  const { min, max } = ttsPaceRange(model);
                  const pace = Math.min(max, Math.max(min, p.voice.ttsPace));
                  return {
                    ...p,
                    voice: {
                      ...p.voice,
                      ttsModel: model,
                      ttsSpeaker: speaker,
                      ttsPace: pace,
                    },
                  };
                })
              }
            />
          </Field>
          <Field id="tts-speaker" label="TTS speaker">
            <SettingSelect
              id="tts-speaker"
              value={form.voice.ttsSpeaker}
              options={speakersForTtsModel(form.voice.ttsModel)}
              onValueChange={(ttsSpeaker) =>
                setForm((p) => ({
                  ...p,
                  voice: { ...p.voice, ttsSpeaker },
                }))
              }
            />
          </Field>
          <TempSlider
            id="tts-temp"
            label="TTS temperature"
            value={form.voice.ttsTemperature}
            min={0.01}
            max={2}
            step={0.01}
            help={TTS_TEMP_HELP}
            lowLabel="Steady"
            highLabel="Expressive"
            onChange={(next) =>
              setForm((p) => ({
                ...p,
                voice: { ...p.voice, ttsTemperature: next },
              }))
            }
          />
          <TempSlider
            id="tts-pace"
            label="TTS pace"
            value={form.voice.ttsPace}
            min={ttsPaceRange(form.voice.ttsModel).min}
            max={ttsPaceRange(form.voice.ttsModel).max}
            step={0.05}
            help={TTS_PACE_HELP}
            lowLabel="Slower"
            highLabel="Faster"
            onChange={(next) =>
              setForm((p) => ({
                ...p,
                voice: { ...p.voice, ttsPace: next },
              }))
            }
          />
          <Field id="tts-lang" label="Default TTS language">
            <SettingSelect
              id="tts-lang"
              value={form.voice.ttsLanguageCode}
              options={VOICE_LANGUAGE_OPTIONS.map((o) => o.code)}
              labels={Object.fromEntries(
                VOICE_LANGUAGE_OPTIONS.map((o) => [
                  o.code,
                  `${o.label} (${o.code})`,
                ]),
              )}
              onValueChange={(ttsLanguageCode) =>
                setForm((p) => ({
                  ...p,
                  voice: { ...p.voice, ttsLanguageCode },
                }))
              }
            />
          </Field>
          <Field id="stt-model" label="STT model">
            <SettingSelect
              id="stt-model"
              value={form.voice.sttModel}
              options={SARVAM_STT_MODELS}
              labels={{
                "saaras:v3": "saaras:v3",
                "saaras:v4": "saaras:v4 (latest)",
              }}
              onValueChange={(sttModel) =>
                setForm((p) => ({
                  ...p,
                  voice: { ...p.voice, sttModel },
                }))
              }
            />
          </Field>
          <Field id="stt-mode" label="STT mode">
            <SettingSelect
              id="stt-mode"
              value={form.voice.sttMode}
              options={SARVAM_STT_MODES}
              labels={{
                transcribe: "transcribe (same language)",
                translate: "translate (to English)",
                verbatim: "verbatim (word-for-word)",
                translit: "translit (romanization)",
                codemix: "codemix (mixed script)",
              }}
              onValueChange={(sttMode) =>
                setForm((p) => ({
                  ...p,
                  voice: { ...p.voice, sttMode },
                }))
              }
            />
          </Field>
          <Field id="tts-codec" label="TTS codec">
            <SettingSelect
              id="tts-codec"
              value={form.voice.ttsCodec}
              options={SARVAM_TTS_CODECS}
              labels={Object.fromEntries(
                SARVAM_TTS_CODECS.map((c) => [c, c]),
              )}
              onValueChange={(ttsCodec) =>
                setForm((p) => ({
                  ...p,
                  voice: { ...p.voice, ttsCodec },
                }))
              }
            />
          </Field>
          <Field id="tts-bitrate" label="TTS bitrate">
            <SettingSelect
              id="tts-bitrate"
              value={form.voice.ttsBitrate}
              options={SARVAM_TTS_BITRATES}
              labels={Object.fromEntries(
                SARVAM_TTS_BITRATES.map((b) => [b, b]),
              )}
              onValueChange={(ttsBitrate) =>
                setForm((p) => ({
                  ...p,
                  voice: { ...p.voice, ttsBitrate },
                }))
              }
            />
          </Field>
        </div>
      </section>

      <section className="border-border space-y-2 border p-4">
        <h2 className="text-foreground text-sm font-medium">System prompts</h2>
        <p className="text-muted-foreground mb-4 text-xs">
          Placeholders are filled at request time. Live job, profile, and
          transcript context is always appended if missing from the template.
          Edits save automatically after you pause typing.
        </p>
        <Accordion type="multiple" defaultValue={["help"]}>
          {PROMPT_FIELDS.map((field) => (
            <AccordionItem key={field.key} value={field.key}>
              <AccordionTrigger>{field.label}</AccordionTrigger>
              <AccordionContent>
                <p className="text-muted-foreground mb-2 font-mono text-[11px]">
                  {field.placeholders}
                </p>
                <Textarea
                  id={`prompt-${field.key}`}
                  rows={14}
                  className="min-h-48 font-mono text-xs"
                  value={form.prompts[field.key]}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      prompts: { ...p.prompts, [field.key]: e.target.value },
                    }))
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      prompts: {
                        ...p.prompts,
                        [field.key]: defaults.prompts[field.key],
                      },
                    }))
                  }
                >
                  Restore default
                </Button>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <AdminAiFlow settings={form} />
    </div>
  );
}
