"use client";

import type { RiveParameters } from "@rive-app/react-webgl2";
import {
  useRive,
  useStateMachineInput,
  useViewModel,
  useViewModelInstance,
  useViewModelInstanceColor,
} from "@rive-app/react-webgl2";
import type { FC, ReactNode } from "react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Delays Rive initialization by one frame so that React Strict Mode's
// immediate unmount cycle never creates a WebGL2 context. Only the
// second (real) mount will initialise, avoiding context exhaustion.
const useStrictModeSafeInit = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => {
      cancelAnimationFrame(id);
      setReady(false);
    };
  }, []);

  return ready;
};

export type PersonaState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "asleep";

interface PersonaProps {
  state: PersonaState;
  onLoad?: RiveParameters["onLoad"];
  onLoadError?: RiveParameters["onLoadError"];
  onReady?: () => void;
  onPause?: RiveParameters["onPause"];
  onPlay?: RiveParameters["onPlay"];
  onStop?: RiveParameters["onStop"];
  className?: string;
  variant?: keyof typeof sources;
}

// The state machine name is always 'default' for Elements AI visuals
const stateMachine = "default";

const sources = {
  command: {
    dynamicColor: true,
    hasModel: true,
    source:
      "https://ejiidnob33g9ap1r.public.blob.vercel-storage.com/command-2.0.riv",
  },
  glint: {
    dynamicColor: true,
    hasModel: true,
    source:
      "https://ejiidnob33g9ap1r.public.blob.vercel-storage.com/glint-2.0.riv",
  },
  halo: {
    dynamicColor: true,
    hasModel: true,
    source:
      "https://ejiidnob33g9ap1r.public.blob.vercel-storage.com/halo-2.0.riv",
  },
  mana: {
    dynamicColor: false,
    hasModel: true,
    source:
      "https://ejiidnob33g9ap1r.public.blob.vercel-storage.com/mana-2.0.riv",
  },
  obsidian: {
    dynamicColor: true,
    hasModel: true,
    source:
      "https://ejiidnob33g9ap1r.public.blob.vercel-storage.com/obsidian-2.0.riv",
  },
  opal: {
    dynamicColor: false,
    hasModel: false,
    source:
      "https://ejiidnob33g9ap1r.public.blob.vercel-storage.com/orb-1.2.riv",
  },
};

const PRIMARY_FALLBACK: [number, number, number] = [35, 62, 255];

function parseCssRgb(value: string): [number, number, number] | null {
  const comma = value.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
  if (comma) {
    return [Number(comma[1]), Number(comma[2]), Number(comma[3])];
  }
  const space = value.match(/rgba?\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (space) {
    return [Number(space[1]), Number(space[2]), Number(space[3])];
  }
  return null;
}

function readPrimaryRgb(): [number, number, number] {
  if (typeof document === "undefined") {
    return PRIMARY_FALLBACK;
  }
  const probe = document.createElement("span");
  probe.style.color = "var(--primary)";
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  document.body.appendChild(probe);
  const parsed = parseCssRgb(getComputedStyle(probe).color);
  probe.remove();
  return parsed ?? PRIMARY_FALLBACK;
}

const usePrimaryRgb = (enabled: boolean) => {
  const [rgb, setRgb] = useState<[number, number, number]>(PRIMARY_FALLBACK);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const sync = () => {
      const next = readPrimaryRgb();
      setRgb((current) =>
        current[0] === next[0] &&
        current[1] === next[1] &&
        current[2] === next[2]
          ? current
          : next,
      );
    };

    sync();

    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributeFilter: ["class", "style"],
      attributes: true,
    });

    let mql: MediaQueryList | null = null;
    if (window.matchMedia) {
      mql = window.matchMedia("(prefers-color-scheme: dark)");
      mql.addEventListener("change", sync);
    }

    return () => {
      observer.disconnect();
      mql?.removeEventListener("change", sync);
    };
  }, [enabled]);

  return rgb;
};

interface PersonaWithModelProps {
  rive: ReturnType<typeof useRive>["rive"];
  source: (typeof sources)[keyof typeof sources];
  children: React.ReactNode;
}

const PersonaWithModel = memo(
  ({ rive, source, children }: PersonaWithModelProps) => {
    const primaryRgb = usePrimaryRgb(source.dynamicColor);
    const viewModel = useViewModel(rive, { useDefault: true });
    const viewModelInstance = useViewModelInstance(viewModel, {
      rive,
      useDefault: true,
    });
    const viewModelInstanceColor = useViewModelInstanceColor(
      "color",
      viewModelInstance,
    );
    const [primaryR, primaryG, primaryB] = primaryRgb;

    useEffect(() => {
      if (!(viewModelInstanceColor && source.dynamicColor)) {
        return;
      }

      viewModelInstanceColor.setRgb(primaryR, primaryG, primaryB);
    }, [
      viewModelInstanceColor,
      source.dynamicColor,
      primaryR,
      primaryG,
      primaryB,
    ]);

    return children;
  },
);

PersonaWithModel.displayName = "PersonaWithModel";

interface PersonaWithoutModelProps {
  children: ReactNode;
}

const PersonaWithoutModel = memo(
  ({ children }: PersonaWithoutModelProps) => children,
);

PersonaWithoutModel.displayName = "PersonaWithoutModel";

export const Persona: FC<PersonaProps> = memo(
  ({
    variant = "obsidian",
    state = "idle",
    onLoad,
    onLoadError,
    onReady,
    onPause,
    onPlay,
    onStop,
    className,
  }) => {
    const source = sources[variant];

    if (!source) {
      throw new Error(`Invalid variant: ${variant}`);
    }

    // Stabilize callbacks to prevent useRive from reinitializing
    const callbacksRef = useRef({
      onLoad,
      onLoadError,
      onPause,
      onPlay,
      onReady,
      onStop,
    });

    useEffect(() => {
      callbacksRef.current = {
        onLoad,
        onLoadError,
        onPause,
        onPlay,
        onReady,
        onStop,
      };
    }, [onLoad, onLoadError, onPause, onPlay, onReady, onStop]);

    const stableCallbacks = useMemo(
      () => ({
        onLoad: ((loadedRive) =>
          callbacksRef.current.onLoad?.(
            loadedRive,
          )) as RiveParameters["onLoad"],
        onLoadError: ((err) =>
          callbacksRef.current.onLoadError?.(
            err,
          )) as RiveParameters["onLoadError"],
        onPause: ((event) =>
          callbacksRef.current.onPause?.(event)) as RiveParameters["onPause"],
        onPlay: ((event) =>
          callbacksRef.current.onPlay?.(event)) as RiveParameters["onPlay"],
        onReady: () => callbacksRef.current.onReady?.(),
        onStop: ((event) =>
          callbacksRef.current.onStop?.(event)) as RiveParameters["onStop"],
      }),
      [],
    );

    // Delay initialisation by one frame to avoid creating (and leaking)
    // a WebGL2 context during React Strict Mode's first throw-away mount.
    const ready = useStrictModeSafeInit();

    const { rive, RiveComponent } = useRive(
      ready
        ? {
            autoplay: true,
            onLoad: stableCallbacks.onLoad,
            onLoadError: stableCallbacks.onLoadError,
            onPause: stableCallbacks.onPause,
            onPlay: stableCallbacks.onPlay,
            onRiveReady: stableCallbacks.onReady,
            onStop: stableCallbacks.onStop,
            src: source.source,
            stateMachines: stateMachine,
          }
        : null,
    );

    const listeningInput = useStateMachineInput(
      rive,
      stateMachine,
      "listening",
    );
    const thinkingInput = useStateMachineInput(rive, stateMachine, "thinking");
    const speakingInput = useStateMachineInput(rive, stateMachine, "speaking");
    const asleepInput = useStateMachineInput(rive, stateMachine, "asleep");

    // Rive state machine inputs are mutable objects that must be set via direct
    // property assignment — this is the intended Rive API, not a React anti-pattern.
    useEffect(() => {
      if (listeningInput) {
        listeningInput.value = state === "listening";
      }
      if (thinkingInput) {
        thinkingInput.value = state === "thinking";
      }
      if (speakingInput) {
        speakingInput.value = state === "speaking";
      }
      if (asleepInput) {
        asleepInput.value = state === "asleep";
      }
    }, [state, listeningInput, thinkingInput, speakingInput, asleepInput]);

    const visual = (
      <RiveComponent className={cn("size-16 shrink-0", className)} />
    );

    if (source.hasModel) {
      return (
        <PersonaWithModel rive={rive} source={source}>
          {visual}
        </PersonaWithModel>
      );
    }

    return <PersonaWithoutModel>{visual}</PersonaWithoutModel>;
  },
);

Persona.displayName = "Persona";
