"use client";

import { MicIcon } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { type AgentState, Orb } from "@/components/ui/orb";

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

function toAgentState(mode: OnboardingVoiceMode): AgentState {
  if (mode === "listen") return "listening";
  if (mode === "speak") return "talking";
  if (mode === "think" || mode === "write") return "thinking";
  return null;
}

function VoiceOrb({
  mode,
  level,
}: {
  mode: OnboardingVoiceMode;
  level: number;
}) {
  const listening = mode === "listen";
  const inputRef = useRef(0);
  const outputRef = useRef(0);
  inputRef.current = Math.min(1, Math.max(0, level) * 3.2);
  outputRef.current = listening ? 0.45 : 0.3;

  return (
    <div
      className="relative size-28 overflow-hidden rounded-full md:size-48"
      role="img"
      aria-label={MODE_LABEL[mode]}
    >
      <Orb
        className="h-full w-full"
        colors={["#233eff", "#c5ceff"]}
        seed={1000}
        agentState={toAgentState(mode)}
        volumeMode={listening ? "manual" : "auto"}
        inputVolumeRef={inputRef}
        outputVolumeRef={outputRef}
      />
    </div>
  );
}

export function OnboardingVoiceDock({
  mode,
  status,
  micReady,
  micError,
  level,
  onEnableMic,
}: {
  mode: OnboardingVoiceMode;
  status: string;
  micReady: boolean;
  micError?: string;
  level?: number;
  onEnableMic: () => void;
}) {
  return (
    <div className="bg-background relative shrink-0">
      <div className="flex flex-col items-center px-4 pt-2 pb-[max(0.85rem,env(safe-area-inset-bottom))]">
        <VoiceOrb mode={mode} level={level ?? 0} />
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
