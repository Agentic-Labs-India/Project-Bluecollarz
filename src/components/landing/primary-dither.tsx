"use client";

import {
  type ComponentType,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import { Dithering as DitheringRaw } from "@/components/landing/ticket";

const Dithering = DitheringRaw as ComponentType<Record<string, unknown>>;

/** Single source of truth — fills, bands, and the admit ticket all read this. */
export const PRIMARY_DITHER = {
  colorBack: "#1a2fd6",
  colorFront: "#4f63f5",
  watermark: "#8b9aff",
} as const;

/** Danger-zone dither — same grain, destructive red. */
export const DESTRUCTIVE_DITHER = {
  colorBack: "#9f1c24",
  colorFront: "#d03238",
} as const;

export type DitherTone = "primary" | "destructive";

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

const SHARED_SIZE = 512;

function hashString(value: string) {
  return value.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

/** One live WebGL dither for the whole page — mirrors paint onto 2D canvases. */
let sharedGlCanvas: HTMLCanvasElement | null = null;
let sharedSubscribers = 0;
let sharedRoot: Root | null = null;
let sharedHost: HTMLDivElement | null = null;
let sharedTeardownTimer: ReturnType<typeof setTimeout> | null = null;

function setSharedGlCanvas(canvas: HTMLCanvasElement | null) {
  sharedGlCanvas = canvas;
}

function SharedDitherMount() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const sync = () => {
      setSharedGlCanvas(wrap.querySelector("canvas"));
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(wrap, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      setSharedGlCanvas(null);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 -z-50 overflow-hidden opacity-0"
      style={{ width: SHARED_SIZE, height: SHARED_SIZE, contain: "strict" }}
    >
      <Dithering
        colorBack={PRIMARY_DITHER.colorBack}
        colorFront={PRIMARY_DITHER.colorFront}
        shape="warp"
        type="random"
        size={0.5}
        scale={1.55}
        rotation={18}
        offsetX={0.05}
        offsetY={-0.08}
        speed={reduced ? 0 : 0.28}
        webGlContextAttributes={{
          preserveDrawingBuffer: true,
          powerPreference: "low-power",
          antialias: false,
        }}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
}

function cancelSharedTeardown() {
  if (sharedTeardownTimer == null) return;
  clearTimeout(sharedTeardownTimer);
  sharedTeardownTimer = null;
}

function ensureSharedHost() {
  if (typeof document === "undefined") return;
  cancelSharedTeardown();
  if (sharedRoot && sharedHost) return;

  sharedHost = document.createElement("div");
  sharedHost.id = "primary-dither-shared-host";
  document.body.appendChild(sharedHost);
  sharedRoot = createRoot(sharedHost);
  sharedRoot.render(<SharedDitherMount />);
}

/** Unmount off the current React render turn to avoid nested-root races. */
function scheduleSharedTeardown(delayMs = 0) {
  cancelSharedTeardown();
  sharedTeardownTimer = setTimeout(() => {
    sharedTeardownTimer = null;
    if (sharedSubscribers > 0) return;
    const root = sharedRoot;
    const host = sharedHost;
    sharedRoot = null;
    sharedHost = null;
    sharedGlCanvas = null;
    if (root) root.unmount();
    host?.remove();
  }, delayMs);
}

function retainSharedDither() {
  sharedSubscribers += 1;
  ensureSharedHost();

  return () => {
    sharedSubscribers = Math.max(0, sharedSubscribers - 1);
    if (sharedSubscribers === 0) {
      // Defer so Strict Mode / sibling effect cleanups don't unmount mid-render.
      scheduleSharedTeardown(0);
    }
  };
}

/** Tear down the shared decorative context; recreate after a beat if still needed. */
export function releaseSharedPrimaryDither() {
  sharedSubscribers = Math.max(sharedSubscribers, 0);
  scheduleSharedTeardown(0);

  window.setTimeout(() => {
    if (sharedSubscribers > 0) ensureSharedHost();
  }, 120);
}

export type PrimaryDitherProps = {
  /** Varies crop / scale so instances don't look identical. */
  seed?: string;
  className?: string;
  /** Opacity of the dither layer (0–1). */
  opacity?: number;
  /** Soft blur on the layer (bands look better with this on). */
  blur?: boolean;
  /** Light primary wash over the dither. */
  wash?: boolean;
  /** When false, copy the shared shader once (admin cards). Default true. */
  animate?: boolean;
  /** Recolor the shared grain. Default primary blue. */
  tone?: DitherTone;
};

/**
 * Reusable primary-blue ticket dither fill.
 * Parent should be `relative` (+ usually `bg-primary` / overflow-hidden).
 *
 * Uses a single shared WebGL shader, mirrored onto a 2D canvas per instance
 * so the admit ticket keeps its own context without starving decorations.
 */
export function PrimaryDither({
  seed = "primary",
  className = "pointer-events-none absolute inset-0 overflow-hidden",
  opacity = 0.85,
  blur = false,
  wash = true,
  animate = true,
  tone = "primary",
}: PrimaryDitherProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const hash = hashString(seed);
  const palette =
    tone === "destructive" ? DESTRUCTIVE_DITHER : PRIMARY_DITHER;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(Boolean(entry?.isIntersecting)),
      { rootMargin: "80px", threshold: 0.02 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    return retainSharedDither();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let running = true;

    const paint = () => {
      if (!running) return;
      const source = sharedGlCanvas;
      const parent = wrapRef.current;
      if (source && parent && source.width > 0 && source.height > 0) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.max(1, Math.floor(parent.clientWidth * dpr));
        const h = Math.max(1, Math.floor(parent.clientHeight * dpr));
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }

        // Seeded crop so neighboring fills don't look identical.
        const zoom = 1 + (hash % 5) * 0.04;
        const srcW = source.width / zoom;
        const srcH = source.height / zoom;
        const srcX = ((hash % 40) / 40) * (source.width - srcW);
        const srcY = (((hash * 3) % 40) / 40) * (source.height - srcH);

        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(source, srcX, srcY, srcW, srcH, 0, 0, w, h);
        if (tone === "destructive") {
          ctx.globalCompositeOperation = "color";
          ctx.fillStyle = DESTRUCTIVE_DITHER.colorBack;
          ctx.fillRect(0, 0, w, h);
          ctx.globalCompositeOperation = "source-over";
        }
        if (!animate) {
          running = false;
          return;
        }
      }
      raf = window.requestAnimationFrame(paint);
    };

    raf = window.requestAnimationFrame(paint);
    return () => {
      running = false;
      window.cancelAnimationFrame(raf);
    };
  }, [visible, hash, animate, tone]);

  return (
    <div ref={wrapRef} aria-hidden className={className}>
      <canvas
        ref={canvasRef}
        className={
          blur
            ? "absolute inset-0 h-full w-full blur-[0.6px]"
            : "absolute inset-0 h-full w-full"
        }
        style={{ opacity, backgroundColor: palette.colorBack }}
      />
      {wash ? (
        <div
          className={
            tone === "destructive"
              ? "pointer-events-none absolute inset-0 bg-destructive/15"
              : "pointer-events-none absolute inset-0 bg-primary/15"
          }
        />
      ) : null}
    </div>
  );
}

/** Thin primary dither strip (role cards, hero pill, etc.). */
export function PrimaryDitherBand({
  seed,
  label,
  className,
  tone = "primary",
}: {
  seed: string;
  label?: string;
  className?: string;
  tone?: DitherTone;
}) {
  return (
    <div
      className={
        className ??
        (tone === "destructive"
          ? "bg-destructive relative h-6 shrink-0 overflow-hidden"
          : "bg-primary relative h-6 shrink-0 overflow-hidden")
      }
    >
      <PrimaryDither seed={seed} opacity={0.9} blur tone={tone} />
      {label ? (
        <span className="font-heading pointer-events-none absolute inset-y-0 right-0 z-10 flex max-w-[70%] items-center truncate px-2.5 text-[9px] font-semibold tracking-[0.08em] text-white/92 uppercase">
          {label}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Remounts paper-shader canvases after WebGL context loss
 * (common when GPU budget is tight on mobile).
 */
export function useRecoverWebGlCanvas(rootRef: RefObject<HTMLElement | null>) {
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let canvas: HTMLCanvasElement | null = null;

    const onLost = (event: Event) => {
      event.preventDefault();
      releaseSharedPrimaryDither();
      window.setTimeout(() => setNonce((n) => n + 1), 48);
    };

    const bind = () => {
      const next = root.querySelector("canvas");
      if (next === canvas) return;
      canvas?.removeEventListener("webglcontextlost", onLost);
      canvas = next;
      canvas?.addEventListener("webglcontextlost", onLost);
    };

    bind();
    const observer = new MutationObserver(bind);
    observer.observe(root, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      canvas?.removeEventListener("webglcontextlost", onLost);
    };
  }, [rootRef, nonce]);

  return nonce;
}
