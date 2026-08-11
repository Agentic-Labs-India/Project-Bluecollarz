"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import { Dithering as DitheringRaw } from "@/components/landing/ticket";

const Dithering = DitheringRaw as ComponentType<Record<string, unknown>>;

const SHAPES = ["warp", "simplex", "swirl", "ripple", "wave"] as const;

/** Single source of truth — fills, bands, and the admit ticket all read this. */
export const PRIMARY_DITHER = {
  colorBack: "#1a2fd6",
  colorFront: "#4f63f5",
  watermark: "#8b9aff",
} as const;

/** Ticket texture preset sharing the same palette. */
export const PRIMARY_TICKET_TEXTURE = {
  colorBack: PRIMARY_DITHER.colorBack,
  colorFront: PRIMARY_DITHER.colorFront,
  shape: "warp" as const,
  type: "random" as const,
  size: 0.55,
  scale: 1.65,
  rotation: 18,
  offsetX: 0.05,
  offsetY: -0.08,
  speed: 0.35,
};

function hashString(value: string) {
  return value.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

export type PrimaryDitherProps = {
  /** Varies shape / rotation / offsets so instances don't look identical. */
  seed?: string;
  className?: string;
  /** Opacity of the shader layer (0–1). */
  opacity?: number;
  /** Soft blur on the shader (bands look better with this on). */
  blur?: boolean;
  /** Light primary wash over the shader. */
  wash?: boolean;
};

/**
 * Reusable primary-blue ticket dither fill.
 * Parent should be `relative` (+ usually `bg-primary` / overflow-hidden).
 */
export function PrimaryDither({
  seed = "primary",
  className = "pointer-events-none absolute inset-0 overflow-hidden",
  opacity = 0.85,
  blur = false,
  wash = true,
}: PrimaryDitherProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [reduced, setReduced] = useState(false);
  const hash = hashString(seed);
  const shape = SHAPES[hash % SHAPES.length];

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setActive(Boolean(entry?.isIntersecting)),
      { rootMargin: "100px", threshold: 0.02 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} aria-hidden className={className}>
      {active ? (
        <div
          className={blur ? "absolute inset-0 blur-[0.6px]" : "absolute inset-0"}
          style={{ opacity }}
        >
          <Dithering
            colorBack={PRIMARY_DITHER.colorBack}
            colorFront={PRIMARY_DITHER.colorFront}
            shape={shape}
            type="random"
            size={0.5}
            scale={1.55}
            rotation={(hash * 17) % 360}
            offsetX={(hash % 20) / 100 - 0.1}
            offsetY={((hash * 3) % 20) / 100 - 0.1}
            speed={reduced ? 0 : 0.25}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
            }}
          />
        </div>
      ) : null}
      {wash ? (
        <div className="pointer-events-none absolute inset-0 bg-primary/15" />
      ) : null}
    </div>
  );
}

/** Thin primary dither strip (role cards, hero pill, etc.). */
export function PrimaryDitherBand({
  seed,
  label,
  className,
}: {
  seed: string;
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={
        className ?? "bg-primary relative h-6 shrink-0 overflow-hidden"
      }
    >
      <PrimaryDither seed={seed} opacity={0.9} blur />
      {label ? (
        <span className="font-heading pointer-events-none absolute inset-y-0 right-0 z-10 flex max-w-[70%] items-center truncate px-2.5 text-[9px] font-semibold tracking-[0.08em] text-white/92 uppercase">
          {label}
        </span>
      ) : null}
    </div>
  );
}
