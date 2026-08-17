"use client";

import { RotateCwIcon, Volume2Icon, VolumeXIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PrimaryDitherBand } from "@/components/landing/primary-dither";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  type ConsentPlaybackScope,
  KYC_NOTICE,
  MANAGE_NOTICE,
  MEDICAL_NOTICE,
} from "@/lib/compliance/consent-notices";
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
  medical:
    "Medical fitness test and its report — booked only after an employer selects you",
};

function offToggles(purposes: string[]): Record<string, boolean> {
  return Object.fromEntries(purposes.map((p) => [p, false]));
}

type ConsentActive = {
  purposes: string[];
  noticeVersion: string | null;
  grantedAt: string | null;
};

type ConsentApiResponse = {
  noticeVersion: string;
  availablePurposes: string[];
  digilockerPurposes?: string[];
  active: ConsentActive;
  error?: string;
};

/**
 * Artifact 2 — purpose toggles, read-aloud, OWRC help, immutable grant/withdraw.
 */
export function ConsentNoticePanel({
  className,
  compact = false,
  variant = "manage",
  verifyHref,
  only,
  onGranted,
}: {
  className?: string;
  compact?: boolean;
  /** KYC gate: all switches start off; Agree and Verify only when all are on. */
  variant?: "kyc" | "manage";
  verifyHref?: string;
  /** Restrict to one purpose so a single step never bundles unrelated consent. */
  only?: string[];
  /** After a successful grant — used by a step that should then move on. */
  onGranted?: () => void;
}) {
  const isKyc = variant === "kyc";
  // Stable dependency: the array prop would be a new reference every render.
  const onlyKey = only?.join(",") ?? "";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState("");
  const [noticeVersion, setNoticeVersion] = useState("1.2");
  const [available, setAvailable] = useState<string[]>(
    Object.keys(PURPOSE_LABELS),
  );
  const [active, setActive] = useState<ConsentActive>({
    purposes: [],
    noticeVersion: null,
    grantedAt: null,
  });
  const [toggles, setToggles] = useState<Record<string, boolean>>(() =>
    offToggles(Object.keys(PURPOSE_LABELS)),
  );
  const [usedVoice, setUsedVoice] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackIdRef = useRef<string | null>(null);
  const autoPlayedRef = useRef(false);
  const medicalOnly = onlyKey === "medical";
  const playbackScope: ConsentPlaybackScope = medicalOnly
    ? "medical"
    : isKyc
      ? "kyc"
      : "manage";
  const noticeText = medicalOnly
    ? MEDICAL_NOTICE
    : isKyc
      ? KYC_NOTICE
      : MANAGE_NOTICE;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/candidate/consent");
      const json = (await res.json().catch(() => ({}))) as ConsentApiResponse;
      if (!res.ok) throw new Error(json.error || "Could not load consent");
      // The identity gate asks only for identity purposes; a scoped step asks
      // only for its own. Everything else manages the full set.
      const scope = isKyc
        ? (json.digilockerPurposes ?? json.availablePurposes)
        : onlyKey
          ? json.availablePurposes.filter((p) => onlyKey.split(",").includes(p))
          : json.availablePurposes;
      setNoticeVersion(json.noticeVersion);
      setAvailable(scope);
      setActive(json.active);
      setToggles(() => {
        const next = offToggles(scope);
        if (!isKyc && json.active.purposes.length) {
          for (const p of scope) {
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
  }, [isKyc, onlyKey]);

  const stopNotice = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.onended = null;
      audio.onerror = null;
      if (audio.src) URL.revokeObjectURL(audio.src);
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  const playNotice = useCallback(
    async (waitUntilEnded: boolean) => {
      stopNotice();
      setSpeaking(true);
      setError("");
      playbackIdRef.current = null;
      try {
        const res = await fetch("/api/candidate/consent/playback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scope: playbackScope }),
        });
        const playbackId = res.headers.get("x-consent-playback-id");
        if (playbackId) playbackIdRef.current = playbackId;
        if (!res.ok) {
          throw new Error("Could not play audio");
        }
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const json = (await res.json().catch(() => ({}))) as {
            playbackId?: string;
            text?: string;
          };
          if (json.playbackId) playbackIdRef.current = json.playbackId;
          const spoken = json.text || noticeText;
          if (!("speechSynthesis" in window)) {
            throw new Error("Could not play audio");
          }
          const utter = new SpeechSynthesisUtterance(spoken);
          utter.lang = "en-IN";
          window.speechSynthesis.cancel();
          setUsedVoice(true);
          if (waitUntilEnded) {
            await new Promise<void>((resolve, reject) => {
              utter.onend = () => {
                setSpeaking(false);
                resolve();
              };
              utter.onerror = () => {
                setSpeaking(false);
                reject(new Error("Could not play audio"));
              };
              window.speechSynthesis.speak(utter);
            });
          } else {
            utter.onend = () => setSpeaking(false);
            utter.onerror = () => setSpeaking(false);
            window.speechSynthesis.speak(utter);
          }
          return;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        setUsedVoice(true);
        const ended = new Promise<void>((resolve, reject) => {
          audio.onended = () => {
            setSpeaking(false);
            resolve();
          };
          audio.onerror = () => {
            setSpeaking(false);
            reject(new Error("Could not play audio"));
          };
        });
        await audio.play();
        if (waitUntilEnded) await ended;
      } catch (e: unknown) {
        setSpeaking(false);
        setError(e instanceof Error ? e.message : "Could not read aloud");
        throw e;
      }
    },
    [noticeText, playbackScope, stopNotice],
  );

  useEffect(() => {
    void load();
    return () => {
      stopNotice();
    };
  }, [load, stopNotice]);

  useEffect(() => {
    if (!isKyc || loading || autoPlayedRef.current) return;
    autoPlayedRef.current = true;
    void playNotice(false).catch(() => undefined);
  }, [isKyc, loading, playNotice]);

  const selected = available.filter((p) => toggles[p]);
  const scopedActive = active.purposes.filter((p) => available.includes(p));
  const allOn =
    available.length > 0 && available.every((p) => Boolean(toggles[p]));
  const canAgreeAndVerify = isKyc && allOn && !saving;

  const grantPurposes = async (purposes: string[]) => {
    const playbackId = playbackIdRef.current;
    if (!playbackId) {
      throw new Error("Play the notice first.");
    }
    const res = await fetch("/api/candidate/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "grant",
        purposes,
        playbackId,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as ConsentApiResponse & {
      error?: string;
    };
    if (!res.ok) throw new Error(json.error || "Could not save consent");
    playbackIdRef.current = null;
    setUsedVoice(false);
    setActive(json.active);
    return json;
  };

  const grant = async () => {
    if (!selected.length) {
      setError(
        medicalOnly
          ? "Turn on the medical test to continue."
          : "Select at least one purpose",
      );
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (!playbackIdRef.current) {
        await playNotice(true);
      }
      await grantPurposes(selected);
      onGranted?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not save consent");
    } finally {
      setSaving(false);
    }
  };

  const agreeAndVerify = async () => {
    if (!allOn) return;
    setSaving(true);
    setError("");
    try {
      if (!playbackIdRef.current) {
        await playNotice(true);
      }
      await grantPurposes(available);
      onGranted?.();
      if (verifyHref) {
        window.location.assign(verifyHref);
        return;
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not save consent");
    } finally {
      setSaving(false);
    }
  };

  const withdrawAll = async () => {
    if (!scopedActive.length) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/candidate/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "withdraw",
          purposes: scopedActive,
          method: "settings",
        }),
      });
      const json = (await res
        .json()
        .catch(() => ({}))) as ConsentApiResponse & {
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || "Could not withdraw consent");
      setActive(json.active);
      setToggles((prev) => {
        const next = { ...prev };
        for (const p of scopedActive) next[p] = false;
        return next;
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not withdraw consent");
    } finally {
      setSaving(false);
    }
  };

  const onSpeakerClick = () => {
    if (speaking) {
      stopNotice();
      return;
    }
    void playNotice(false).catch(() => undefined);
  };

  if (loading) {
    return (
      <div className={cn("border-border space-y-2 border p-4", className)}>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  return (
    <div
      className={cn("border-border bg-card overflow-hidden border", className)}
    >
      {isKyc ? <PrimaryDitherBand seed="kyc-consent-notice" /> : null}
      <div className="space-y-4 p-5">
        {!compact ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-foreground text-sm font-medium">
                Before you continue (notice v{noticeVersion})
              </p>
              {isKyc ? (
                <button
                  type="button"
                  onClick={onSpeakerClick}
                  className="text-foreground hover:text-primary focus-visible:ring-ring relative inline-flex size-8 shrink-0 items-center justify-center focus-visible:ring-1 focus-visible:outline-none"
                  aria-label={speaking ? "Mute notice" : "Play notice again"}
                >
                  {speaking ? (
                    <VolumeXIcon className="size-4" />
                  ) : (
                    <span className="relative inline-flex">
                      <Volume2Icon className="size-4" />
                      <RotateCwIcon className="absolute -right-1.5 -bottom-1 size-2.5" />
                    </span>
                  )}
                </button>
              ) : null}
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {noticeText}
            </p>
          </div>
        ) : (
          <p className="text-foreground text-sm font-medium">
            Purpose consent (notice v{noticeVersion})
          </p>
        )}
        {!isKyc ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={speaking || saving}
            onClick={() => void playNotice(false).catch(() => undefined)}
          >
            {speaking
              ? "Reading…"
              : usedVoice
                ? "Read aloud again"
                : "Read aloud"}
          </Button>
        ) : null}

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

        {scopedActive.length && !isKyc ? (
          <p className="text-muted-foreground text-xs">
            Active consent recorded{" "}
            {active.grantedAt
              ? new Date(active.grantedAt).toLocaleString()
              : ""}
            {active.noticeVersion ? ` · notice v${active.noticeVersion}` : null}
            {` · ${scopedActive.join(", ")}`}
          </p>
        ) : null}

        {error ? <p className="text-destructive text-sm">{error}</p> : null}

        {isKyc ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <Button
              type="button"
              size="lg"
              className="w-full sm:w-auto"
              disabled={!canAgreeAndVerify}
              onClick={() => void agreeAndVerify()}
            >
              Agree and Verify
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="w-full sm:w-auto"
              asChild
            >
              <a href={`tel:${OWRC_HELP_LINE.replace(/\s/g, "")}`}>
                Ask me a question → OWRC {OWRC_HELP_LINE}
              </a>
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size={onGranted ? "lg" : "default"}
              className={onGranted ? "w-full sm:w-auto" : undefined}
              disabled={saving || speaking || !selected.length}
              onClick={() => void grant()}
            >
              {saving
                ? "Saving…"
                : onGranted
                  ? "I agree — continue"
                  : "I agree"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving || !scopedActive.length}
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
        )}

        {!isKyc && !selected.length ? (
          <p className="text-muted-foreground text-xs">
            {medicalOnly
              ? "Turn on the medical test, then agree to continue."
              : available.includes("identity") && available.includes("contact")
                ? "Turn on identity and contact to continue DigiLocker verification."
                : "Turn on the purposes you agree to."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
