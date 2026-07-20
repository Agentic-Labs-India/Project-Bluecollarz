"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchProfileVoiceLanguage,
  saveProfileVoiceLanguage,
  VOICE_LANGUAGE_OPTIONS,
  type TtsLanguageCode,
} from "@/lib/voice/languages";
import { TTS_VOICE } from "@/lib/voice/style";

/** Settings control for profile.voiceLanguage (onboarding + interviews). */
export function AppLanguageSetting() {
  const [value, setValue] = useState<TtsLanguageCode>(TTS_VOICE.languageCode);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const code = await fetchProfileVoiceLanguage();
        if (!cancelled) {
          setValue(code ?? TTS_VOICE.languageCode);
        }
      } catch {
        if (!cancelled) setError("Could not load language.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onChange = async (next: string) => {
    const code = (next as TtsLanguageCode) || TTS_VOICE.languageCode;
    const previous = value;
    setValue(code);
    setSaving(true);
    setError("");
    try {
      await saveProfileVoiceLanguage(code);
    } catch {
      setValue(previous);
      setError("Could not save language. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <Label className="text-foreground text-sm font-medium">
          App Language
        </Label>
        <p className="text-muted-foreground mt-1 text-sm">
          Used for AI onboarding and interviews (speech and replies). You can
          change this anytime.
        </p>
        {error ? (
          <p className="text-destructive mt-1.5 text-xs">{error}</p>
        ) : null}
      </div>
      <Select
        value={value}
        onValueChange={(v) => void onChange(v)}
        disabled={loading || saving}
      >
        <SelectTrigger
          className="w-full sm:w-56"
          aria-label="App Language"
        >
          <SelectValue
            placeholder={loading ? "Loading…" : "Select language"}
          />
        </SelectTrigger>
        <SelectContent>
          {VOICE_LANGUAGE_OPTIONS.map((opt) => (
            <SelectItem key={opt.code} value={opt.code}>
              {opt.nativeLabel} ({opt.label})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
