"use client";

import { MicIcon } from "lucide-react";
import type { PersonaState } from "@/components/ai-elements/persona";
import { Persona } from "@/components/ai-elements/persona";
import { useAfterPlatformTerms } from "@/components/compliance/platform-terms-gate";
import { Button } from "@/components/ui/button";

export type OnboardingVoiceMode =
  | "start"
  | "pick"
  | "listen"
  | "speak"
  | "think"
  | "write"
  | "idle"
  | "done"
  | "error";

const MODE_LABEL: Record<OnboardingVoiceMode, string> = {
  start: "Ready",
  pick: "Choose an option",
  listen: "Listening",
  speak: "Speaking",
  think: "Thinking",
  write: "Writing",
  idle: "Your turn",
  done: "Done",
  error: "Mic needed",
};

function toPersonaState(mode: OnboardingVoiceMode): PersonaState {
  if (mode === "listen") return "listening";
  if (mode === "speak") return "speaking";
  if (mode === "think" || mode === "write") return "thinking";
  if (mode === "done") return "asleep";
  return "idle";
}

function OrbPrimaryFilter() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute size-0 overflow-hidden"
    >
      <title>Primary orb tint</title>
      <filter id="voice-orb-primary-light" colorInterpolationFilters="sRGB">
        <feColorMatrix
          type="matrix"
          values="0.085 0.286 0.029 0 0.42 0.102 0.343 0.035 0 0.50 0.017 0.057 0.006 0 0.93 0 0 0 1 0"
        />
      </filter>
      <filter id="voice-orb-primary-dark" colorInterpolationFilters="sRGB">
        <feColorMatrix
          type="matrix"
          values="0.029 0.098 0.010 0 0 0.052 0.174 0.018 0 0 0.213 0.715 0.072 0 0 0 0 0 1 0"
        />
      </filter>
    </svg>
  );
}

function VoicePersona({ mode }: { mode: OnboardingVoiceMode }) {
  const live = useAfterPlatformTerms(500);

  return (
    <div className="relative size-48" role="img" aria-label={MODE_LABEL[mode]}>
      <OrbPrimaryFilter />
      {live ? (
        <>
          <div className="size-full [filter:url(#voice-orb-primary-light)] dark:[filter:url(#voice-orb-primary-dark)]">
            <Persona
              className="size-full bg-transparent"
              state={toPersonaState(mode)}
              variant="opal"
            />
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(ellipse_at_30%_24%,rgb(255_255_255_/_0.35),transparent_44%)] mix-blend-soft-light dark:hidden"
          />
        </>
      ) : null}
    </div>
  );
}

export function OnboardingVoiceDock({
  mode,
  status,
  micReady,
  micError,
  onEnableMic,
}: {
  mode: OnboardingVoiceMode;
  status: string;
  micReady: boolean;
  micError?: string;
  onEnableMic: () => void;
}) {
  return (
    <div className="bg-background relative shrink-0">
      <div className="flex flex-col items-center px-4 pt-2 pb-[max(0.85rem,env(safe-area-inset-bottom))]">
        <VoicePersona mode={mode} />
        <p
          className="text-muted-foreground mt-1 max-w-sm text-center text-xs font-bold tracking-wide md:text-sm"
          aria-live="polite"
        >
          {status}
        </p>
        {micError ? (
          <p className="text-destructive mt-1 text-center text-sm">
            {micError}
          </p>
        ) : null}
        {!micReady ? (
          <Button
            type="button"
            size="sm"
            className="mt-3 w-full max-w-xs"
            onClick={onEnableMic}
          >
            <MicIcon className="size-4" />
            Enable microphone &amp; start
          </Button>
        ) : null}
      </div>
    </div>
  );
}
