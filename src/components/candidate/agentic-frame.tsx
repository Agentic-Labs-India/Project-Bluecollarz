"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import type { VoiceSessionMode } from "@/components/candidate/voice-orb";
import { cn } from "@/lib/utils";

/** Comet-style session chrome: AI owns the session vs waiting on you. */
export type AgenticState = "off" | "active" | "await";

export function agenticStateFromVoiceMode(
  mode: VoiceSessionMode,
): AgenticState {
  if (mode === "pick") return "await";
  if (
    mode === "listen" ||
    mode === "speak" ||
    mode === "think" ||
    mode === "write"
  ) {
    return "active";
  }
  return "off";
}

function ringShadow(color: string) {
  return [
    `inset 0 0 0 1.5px ${color}`,
    `inset 0 0 18px 3px ${color}`,
    `inset 0 0 36px 8px ${color}`,
  ].join(", ");
}

/** Dark blue glow — not the indigo/purple primary-active token. */
const ACTIVE_GLOW = "#0b2fd4";
const AWAIT_GLOW = "#c2410c";

export function AgenticFrame({
  state,
  className,
  children,
}: {
  state: AgenticState;
  className?: string;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const on = state !== "off";
  const color = state === "await" ? AWAIT_GLOW : ACTIVE_GLOW;

  return (
    <div
      className={cn("relative", className)}
      data-agentic={state}
      data-slot="agentic-frame"
    >
      {children}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[60] rounded-[inherit]"
        style={{ boxShadow: ringShadow(color) }}
        initial={false}
        animate={
          !on
            ? { opacity: 0 }
            : reduceMotion
              ? { opacity: 0.55 }
              : { opacity: [0.4, 0.72, 0.4] }
        }
        transition={
          !on || reduceMotion
            ? { duration: 0.3, ease: "easeOut" }
            : {
                duration: state === "await" ? 1.6 : 2.2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }
        }
      />
    </div>
  );
}
