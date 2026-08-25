"use client";

import { CircleHelpIcon } from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AdminAiFlow } from "@/components/admin/admin-ai-flow";
import { AdminPromptCards } from "@/components/admin/admin-prompt-cards";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  type LlmTemperatureKey,
  type PlatformSettingsPublic,
  PROMPT_KEYS,
  type PromptKey,
} from "@/lib/admin/platform-settings-types";
import { VOICE_LANGUAGE_OPTIONS } from "@/lib/ai/voice/languages";
import {
  defaultSpeakerForTtsModel,
  SARVAM_STT_MODELS,
  SARVAM_TTS_BITRATES,
  SARVAM_TTS_CODECS,
  SARVAM_TTS_MODELS,
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

const TTS_LANG_LABELS = Object.fromEntries(
  VOICE_LANGUAGE_OPTIONS.map((o) => [o.code, `${o.label} (${o.code})`]),
);
const TTS_LANG_CODES = VOICE_LANGUAGE_OPTIONS.map((o) => o.code);
const TTS_CODEC_LABELS = Object.fromEntries(
  SARVAM_TTS_CODECS.map((c) => [c, c]),
);
const TTS_BITRATE_LABELS = Object.fromEntries(
  SARVAM_TTS_BITRATES.map((b) => [b, b]),
);

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
  children: ReactNode;
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

function titleCase(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function SettingSelect<T extends string>({
  id,
  value,
  options,
  labels,
  onValueChange,
}: {
  id: string;
  value: T;
  options: readonly T[];
  labels?: Record<string, string>;
  onValueChange: (value: T) => void;
}) {
  const items = options.includes(value) ? options : [value, ...options];
  return (
    <Select value={value} onValueChange={(next) => onValueChange(next as T)}>
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
            if (typeof next === "number" && Number.isFinite(next))
              onChange(next);
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

export type AdminSettingsSection =
  | "voice"
  | "llm"
  | "grievance"
  | "prompts"
  | "flow";

export function AdminSettingsForm({
  initial,
  defaults,
  section,
}: {
  initial: PlatformSettingsPublic;
  defaults: PlatformSettingsPublic;
  section: AdminSettingsSection;
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
  const go = form.grievanceOfficer;
  const voice = form.voice;
  const pace = ttsPaceRange(voice.ttsModel);

  useEffect(() => {
    if (!isSavable(form)) {
      setStatus("idle");
      setError("Prompts must stay at least 20 characters to save.");
      return;
    }

    setError("");
    const handle = window.setTimeout(() => {
      const body = JSON.stringify(payloadOf(formRef.current));
      if (body === lastSent.current) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const gen = ++saveGen.current;
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
          const saved = json.settings;
          setForm((prev) => ({
            ...prev,
            updatedAt: saved.updatedAt,
            updatedBy: saved.updatedBy,
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

  const onPromptChange = useCallback((key: PromptKey, value: string) => {
    setForm((p) => ({
      ...p,
      prompts: { ...p.prompts, [key]: value },
    }));
  }, []);

  return (
    <div className="space-y-8">
      {section !== "flow" ? (
        <p className="text-muted-foreground text-xs">
          {status === "saving"
            ? "Saving…"
            : status === "saved"
              ? "Saved. New AI and voice requests use these values."
              : form.updatedAt
                ? `Last saved ${new Date(form.updatedAt).toLocaleString()}`
                : "Using defaults. Edits save automatically."}
        </p>
      ) : null}
      {status === "error" && error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : null}

      {section === "grievance" ? (
        <section className="border-border space-y-4 border p-4">
          <p className="text-muted-foreground text-xs">
            Shown on /grievance. Email is required. Add a named officer, phone,
            and street address when appointed. Until then the grievance desk
            email is published.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="go-name" label="Name">
              <Input
                id="go-name"
                value={go.name}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    grievanceOfficer: {
                      ...p.grievanceOfficer,
                      name: e.target.value,
                    },
                  }))
                }
              />
            </Field>
            <Field id="go-email" label="Email">
              <Input
                id="go-email"
                type="email"
                value={go.email}
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
                value={go.phone}
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
                value={go.languages.join(", ")}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    grievanceOfficer: {
                      ...p.grievanceOfficer,
                      languages: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    },
                  }))
                }
                placeholder="Hindi, English"
              />
            </Field>
          </div>
          <Field id="go-address" label="Postal address">
            <Textarea
              id="go-address"
              rows={3}
              value={go.address}
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
      ) : null}

      {section === "llm" ? (
        <section className="border-border space-y-4 border p-4">
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
      ) : null}

      {section === "voice" ? (
        <section className="border-border space-y-4 border p-4">
          <p className="text-muted-foreground text-xs">
            Options match Sarvam TTS (Bulbul) and STT (Saaras) docs. Speakers
            change with the TTS model.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="tts-model" label="TTS model">
              <SettingSelect
                id="tts-model"
                value={voice.ttsModel}
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
                    const range = ttsPaceRange(model);
                    return {
                      ...p,
                      voice: {
                        ...p.voice,
                        ttsModel: model,
                        ttsSpeaker: speaker,
                        ttsPace: Math.min(
                          range.max,
                          Math.max(range.min, p.voice.ttsPace),
                        ),
                      },
                    };
                  })
                }
              />
            </Field>
            <Field id="tts-speaker" label="TTS speaker">
              <SettingSelect
                id="tts-speaker"
                value={voice.ttsSpeaker}
                options={speakersForTtsModel(voice.ttsModel)}
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
              value={voice.ttsTemperature}
              min={0.01}
              max={2}
              step={0.01}
              help={TTS_TEMP_HELP}
              lowLabel="Steady"
              highLabel="Expressive"
              onChange={(ttsTemperature) =>
                setForm((p) => ({
                  ...p,
                  voice: { ...p.voice, ttsTemperature },
                }))
              }
            />
            <TempSlider
              id="tts-pace"
              label="TTS pace"
              value={voice.ttsPace}
              min={pace.min}
              max={pace.max}
              step={0.05}
              help={TTS_PACE_HELP}
              lowLabel="Slower"
              highLabel="Faster"
              onChange={(ttsPace) =>
                setForm((p) => ({
                  ...p,
                  voice: { ...p.voice, ttsPace },
                }))
              }
            />
            <Field id="tts-lang" label="Default TTS language">
              <SettingSelect
                id="tts-lang"
                value={voice.ttsLanguageCode}
                options={TTS_LANG_CODES}
                labels={TTS_LANG_LABELS}
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
                value={voice.sttModel}
                options={SARVAM_STT_MODELS}
                labels={{
                  "saaras:v3": "saaras:v3 (recommended)",
                  "saaras:v4": "saaras:v4 (Global English — not for Indic)",
                }}
                onValueChange={(sttModel) =>
                  setForm((p) => ({
                    ...p,
                    voice: { ...p.voice, sttModel },
                  }))
                }
              />
            </Field>
            <Field id="tts-codec" label="TTS codec">
              <SettingSelect
                id="tts-codec"
                value={voice.ttsCodec}
                options={SARVAM_TTS_CODECS}
                labels={TTS_CODEC_LABELS}
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
                value={voice.ttsBitrate}
                options={SARVAM_TTS_BITRATES}
                labels={TTS_BITRATE_LABELS}
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
      ) : null}

      {section === "prompts" ? (
        <AdminPromptCards
          prompts={form.prompts}
          defaults={defaults.prompts}
          onChange={onPromptChange}
        />
      ) : null}
      {section === "flow" ? <AdminAiFlow settings={form} /> : null}
    </div>
  );
}
