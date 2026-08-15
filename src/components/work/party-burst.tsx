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

function spawn(originX: number, originY: number, dir: 1 | -1): Particle[] {
  const out: Particle[] = [];
  for (let i = 0; i < 42; i++) {
    const speed = 7 + Math.random() * 11;
    const spread = (Math.random() - 0.35) * 1.15;
    out.push({
      x: originX,
      y: originY,
      vx: dir * Math.cos(spread) * speed,
      vy: -Math.sin(0.7 + Math.random() * 0.7) * speed,
      w: 4 + Math.random() * 5,
      h: 7 + Math.random() * 8,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      color: COLORS[i % COLORS.length]!,
      life: 1,
    });
  }
  return out;
}

/** Two party-cannon bursts from the footer corners. */
export function PartyBurst() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const parent = canvas.parentElement;
    const size = () => {
      const w = parent?.clientWidth || window.innerWidth;
      const h = Math.max(parent?.clientHeight || 160, 160);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w, h };
    };

    let { w, h } = size();
    let particles = [
      ...spawn(24, h - 8, 1),
      ...spawn(w - 24, h - 8, -1),
    ];
    let raf = 0;
    let running = true;

    const tick = () => {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      const next: Particle[] = [];
      for (const p of particles) {
        p.vy += 0.22;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life -= 0.012;
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
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-30"
    />
  );
}
