"use client";

import { useEffect, useRef } from "react";

const COLORS = ["#233EFF", "#ffffff", "#8b9aff", "#4f63f5"];

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rot: number;
  vr: number;
  color: string;
  life: number;
};

function particle(
  x: number,
  y: number,
  vx: number,
  vy: number,
  color: string,
): Particle {
  return {
    x,
    y,
    vx,
    vy,
    w: 4 + Math.random() * 5,
    h: 7 + Math.random() * 8,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.1,
    color,
    life: 1,
  };
}

function spawnCannon(originX: number, originY: number, dir: 1 | -1): Particle[] {
  const out: Particle[] = [];
  for (let i = 0; i < 42; i++) {
    const speed = 1.8 + Math.random() * 2.8;
    const spread = (Math.random() - 0.35) * 1.15;
    out.push(
      particle(
        originX,
        originY,
        dir * Math.cos(spread) * speed,
        -Math.sin(0.7 + Math.random() * 0.7) * speed,
        COLORS[i % COLORS.length]!,
      ),
    );
  }
  return out;
}

function spawnBottom(originX: number, originY: number): Particle[] {
  const out: Particle[] = [];
  for (let i = 0; i < 88; i++) {
    const speed = 4.6 + Math.random() * 4.2;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.9;
    out.push(
      particle(
        originX + (Math.random() - 0.5) * 18,
        originY,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        COLORS[i % COLORS.length]!,
      ),
    );
  }
  return out;
}

/** Corner cannons; `shower` adds a high bottom-center burst (selected). */
export function PartyBurst({ shower = false }: { shower?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = () => {
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w, h };
    };

    let { w, h } = size();
    let particles = [
      ...spawnCannon(24, h - 8, 1),
      ...spawnCannon(w - 24, h - 8, -1),
      ...(shower ? spawnBottom(w * 0.5, h) : []),
    ];
    let raf = 0;
    let running = true;

    const tick = () => {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      const next: Particle[] = [];
      for (const p of particles) {
        p.vy += 0.045;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life -= 0.0028;
        if (p.life <= 0 || p.y > h + 20) continue;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
        next.push(p);
      }
      particles = next;
      if (next.length) {
        raf = window.requestAnimationFrame(tick);
      }
    };

    raf = window.requestAnimationFrame(tick);
    return () => {
      running = false;
      window.cancelAnimationFrame(raf);
    };
  }, [shower]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-30 h-full w-full"
    />
  );
}
