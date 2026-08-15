"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const OWRC_HELP_LINE = "1800 11 3090";

const PURPOSE_LABELS: Record<string, string> = {
  identity: "PAN, Aadhaar, Name — to confirm your identity",
  contact: "Email & mobile — to contact you and secure your account",
  qualification: "Educational certificates — to verify your qualifications",
  background: "Police Clearance Certificate — for a background conclusion",
  passport: "Passport — for identity and emigration processing",
  evaluation:
    "AI interviews, transcripts, and optional recording — to evaluate you for a role",
};

const PLAIN_LANGUAGE = [
  "Before you continue, we need your permission to check and use your details.",
  "We will check your documents through DigiLocker and other official sources to verify who you are, your qualifications, and your background.",
  "We will show only the results of those checks to trusted employers — never your actual documents.",
  "If you agree to evaluation, we may share interview scores, transcripts, and recordings with the employer for that role.",
  "A licensed recruiting agent will use your details to recruit you for a job, as the law requires.",
  "You pay nothing. Ever. Employers pay us.",
  "You can see, correct, or delete your data any time, and withdraw this permission any time.",
  "We will never sell your data or charge you.",
].join(" ");

type ConsentActive = {
  purposes: string[];
  noticeVersion: string | null;
  grantedAt: string | null;
};

type ConsentApiResponse = {
  noticeVersion: string;
  availablePurposes: string[];
  active: ConsentActive;
  error?: string;
};

/**
 * Artifact 2 — purpose toggles, read-aloud, OWRC help, immutable grant/withdraw.
 */
export function ConsentNoticePanel({
  className,
  onGranted,
  onDeferred,
  compact = false,
}: {
  className?: string;
  onGranted?: () => void;
  onDeferred?: () => void;
  compact?: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState("");
  const [noticeVersion, setNoticeVersion] = useState("1.1");
  const [available, setAvailable] = useState<string[]>(
    Object.keys(PURPOSE_LABELS),
  );
  const [active, setActive] = useState<ConsentActive>({
    purposes: [],
    noticeVersion: null,
    grantedAt: null,
  });
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    identity: true,
    contact: true,
    qualification: true,
    background: false,
    passport: false,
    evaluation: true,
  });
  const [usedVoice, setUsedVoice] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/candidate/consent");
      const json = (await res.json().catch(() => ({}))) as ConsentApiResponse;
      if (!res.ok) throw new Error(json.error || "Could not load consent");
      setNoticeVersion(json.noticeVersion);
      setAvailable(json.availablePurposes);
      setActive(json.active);
      setToggles((prev) => {
        const next = { ...prev };
        for (const p of json.availablePurposes) {
          next[p] = json.active.purposes.includes(p)
            ? true
            : (prev[p] ?? false);
        }
        if (json.active.purposes.length) {
          for (const p of json.availablePurposes) {
            next[p] = json.active.purposes.includes(p);
          }
        }
        return next;
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load consent");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => {
      audioRef.current?.pause();
      if (audioRef.current?.src) URL.revokeObjectURL(audioRef.current.src);
    };
  }, [load]);

  const selected = available.filter((p) => toggles[p]);
  const hasIdentityBundle =
    selected.includes("identity") && selected.includes("contact");

  const readAloud = async () => {
    setSpeaking(true);
    setError("");
    try {
      const res = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: PLAIN_LANGUAGE }),
      });
      if (!res.ok) {
        // Fallback: browser speech synthesis (still counts as voice confirmation).
        if ("speechSynthesis" in window) {
          const utter = new SpeechSynthesisUtterance(PLAIN_LANGUAGE);
          utter.lang = "en-IN";
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utter);
          setUsedVoice(true);
          return;
        }
        throw new Error("Could not play audio");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioRef.current?.src) URL.revokeObjectURL(audioRef.current.src);
      const audio = new Audio(url);
      audioRef.current = audio;
      setUsedVoice(true);
      await audio.play();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not read aloud");
    } finally {
      setSpeaking(false);
    }
  };

  const grant = async () => {
    if (!selected.length) {
      setError("Select at least one purpose");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/candidate/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "grant",
          purposes: selected,
          method: usedVoice ? "voice_tap" : "web_tap",
        }),
      });
      const json = (await res.json().catch(() => ({}))) as ConsentApiResponse & {
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || "Could not save consent");
      setActive(json.active);
      onGranted?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not save consent");
    } finally {
      setSaving(false);
    }
  };

  const withdrawAll = async () => {
    if (!active.purposes.length) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/candidate/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "withdraw",
          purposes: active.purposes,
          method: "settings",
        }),
      });
      const json = (await res.json().catch(() => ({}))) as ConsentApiResponse & {
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || "Could not withdraw consent");
      setActive(json.active);
      setToggles((prev) => {
        const next = { ...prev };
        for (const p of active.purposes) next[p] = false;
        return next;
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not withdraw consent");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div
        className={cn(
          "border-border bg-muted/30 border p-4 text-sm",
          className,
        )}
      >
        Loading consent…
      </div>
    );
  }

  return (
    <div className={cn("border-border bg-card space-y-4 border p-5", className)}>
      {!compact ? (
        <div className="space-y-2">
          <p className="text-foreground text-sm font-medium">
            Before you continue — your permission (notice v{noticeVersion})
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {PLAIN_LANGUAGE}
          </p>
        </div>
      ) : (
        <p className="text-foreground text-sm font-medium">
          Purpose consent (notice v{noticeVersion})
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={speaking}
        onClick={() => void readAloud()}
      >
        {speaking ? "Reading…" : usedVoice ? "Read aloud again" : "Read aloud"}
      </Button>

      <div className="space-y-3">
        {available.map((purpose) => (
          <div
            key={purpose}
            className="flex items-start justify-between gap-3"
          >
            <Label
              htmlFor={`consent-${purpose}`}
              className="text-foreground cursor-pointer text-sm leading-snug font-normal"
            >
              {PURPOSE_LABELS[purpose] ?? purpose}
            </Label>
            <Switch
              id={`consent-${purpose}`}
              checked={Boolean(toggles[purpose])}
              onCheckedChange={(checked) =>
                setToggles((prev) => ({ ...prev, [purpose]: checked }))
              }
            />
          </div>
        ))}
      </div>

      {active.grantedAt ? (
        <p className="text-muted-foreground text-xs">
          Active consent recorded {new Date(active.grantedAt).toLocaleString()}
          {active.noticeVersion ? ` · notice v${active.noticeVersion}` : null}
          {active.purposes.length
            ? ` · ${active.purposes.join(", ")}`
            : " · none active"}
        </p>
      ) : (
        <p className="text-muted-foreground text-xs">
          No consent on file yet. DigiLocker requires identity + contact.
        </p>
      )}

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={saving || !hasIdentityBundle || !usedVoice}
          onClick={() => void grant()}
        >
          I agree
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={saving}
          onClick={() => onDeferred?.()}
        >
          Not now
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={saving || !active.purposes.length}
          onClick={() => void withdrawAll()}
        >
          Withdraw
        </Button>
        <Button type="button" variant="ghost" asChild>
          <a href={`tel:${OWRC_HELP_LINE.replace(/\s/g, "")}`}>
            Ask me a question → OWRC {OWRC_HELP_LINE}
          </a>
        </Button>
      </div>
      {!hasIdentityBundle ? (
        <p className="text-muted-foreground text-xs">
          Turn on identity and contact to continue DigiLocker verification.
        </p>
      ) : null}
      {hasIdentityBundle && !usedVoice ? (
        <p className="text-muted-foreground text-xs">
          Tap Read aloud first. Agreement is recorded as a voice confirmation.
        </p>
      ) : null}
    </div>
  );
}
