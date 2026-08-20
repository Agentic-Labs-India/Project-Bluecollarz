"use client";

import type { ReactNode } from "react";
import type { PersonaState } from "@/components/ai-elements/persona";
import { Persona } from "@/components/ai-elements/persona";

export type VoiceSessionMode =
  | "start"
  | "pick"
  | "listen"
  | "speak"
  | "think"
  | "write"
  | "idle"
  | "done"
  | "error";

const MODE_LABEL: Record<VoiceSessionMode, string> = {
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

export function voiceModeToPersona(mode: VoiceSessionMode): PersonaState {
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

export function VoiceOrb({
  state,
  label,
  live,
}: {
  state: PersonaState;
  label: string;
  live: boolean;
}) {
  return (
    <div className="relative size-48" role="img" aria-label={label}>
      <OrbPrimaryFilter />
      {live ? (
        <>
          <div className="size-full [filter:url(#voice-orb-primary-light)] dark:[filter:url(#voice-orb-primary-dark)]">
            <Persona
              className="size-full bg-transparent"
              state={state}
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

export function VoiceSessionDock({
  mode,
  status,
  live,
  error,
  children,
}: {
  mode: VoiceSessionMode;
  status: string;
  live: boolean;
  error?: string;
  children?: ReactNode;
}) {
  return (
    <div className="bg-background relative shrink-0">
      <div className="flex flex-col items-center px-4 pt-2 pb-[max(0.85rem,env(safe-area-inset-bottom))]">
        <VoiceOrb
          label={MODE_LABEL[mode]}
          live={live}
          state={voiceModeToPersona(mode)}
        />
        <p
          className="text-muted-foreground mt-1 max-w-sm text-center text-xs font-bold tracking-wide md:text-sm"
          aria-live="polite"
        >
          {status}
        </p>
        {error ? (
          <p className="text-destructive mt-1 text-center text-sm">{error}</p>
        ) : null}
        {children}
      </div>
    </div>
  );
}
