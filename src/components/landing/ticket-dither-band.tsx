"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import { Dithering as DitheringRaw } from "@/components/landing/ticket";

const Dithering = DitheringRaw as ComponentType<Record<string, unknown>>;

const SHAPES = ["warp", "simplex", "swirl", "ripple", "wave"] as const;

function hashString(value: string) {
  return value.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

/** Thin primary-blue ticket dither strip (same shader vibe as AdmitOneTicket). */
export function TicketDitherBand({
  seed,
  label,
  className,
}: {
  seed: string;
  label?: string;
  className?: string;
}) {
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
      { rootMargin: "80px", threshold: 0.05 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={
        className ?? "relative h-6 shrink-0 overflow-hidden bg-[#2f4af5]"
      }
    >
      {active ? (
        <div className="absolute inset-0 opacity-90 blur-[0.6px]">
          <Dithering
            colorBack="#233eff"
            colorFront="#9aabff"
            shape={shape}
            type="random"
            size={0.45}
            scale={1.85}
            rotation={(hash * 17) % 360}
            offsetX={(hash % 20) / 100 - 0.1}
            offsetY={((hash * 3) % 20) / 100 - 0.1}
            speed={reduced ? 0 : 0.28}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
            }}
          />
        </div>
      ) : null}
      <div className="pointer-events-none absolute inset-0 bg-primary/10" />
      {label ? (
        <span className="font-heading pointer-events-none absolute inset-y-0 right-0 z-10 flex max-w-[70%] items-center truncate px-2.5 text-[9px] font-semibold tracking-[0.08em] text-white/92 uppercase">
          {label}
        </span>
      ) : null}
    </div>
  );
}
