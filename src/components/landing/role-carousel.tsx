"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { signInWithGoogle } from "@/lib/auth/google-sign-in";
import type { LandingRole } from "@/lib/jobs/queries";

const AVATAR_COLORS = [
  "bg-primary",
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
  "bg-primary-active",
  "bg-ink-deep",
  "bg-warning",
  "bg-negative",
] as const;

type Avatar = { letter: string; colorClass: (typeof AVATAR_COLORS)[number] };

function avatarsForRole(jobId: string, title: string): Avatar[] {
  const words = title.split(/\s+/).filter((word) => word.length > 1);
  const letters = [
    words[0]?.[0] ?? "A",
    words[1]?.[0] ?? words[0]?.[1] ?? "B",
    words[2]?.[0] ?? words[0]?.[2] ?? "C",
  ].map((letter) => letter.toUpperCase());

  const hash = jobId.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return letters.map((letter, index) => ({
    letter,
    colorClass: AVATAR_COLORS[(hash + index) % AVATAR_COLORS.length],
  }));
}

function roleActivityLabel(role: LandingRole): string {
  if (role.hiredThisMonth > 0) {
    return `${role.hiredThisMonth} hired recently`;
  }
  if (role.applicantCount > 0) {
    return `${role.applicantCount} ${role.applicantCount === 1 ? "applicant" : "applicants"}`;
  }
  return "Be the first to apply";
}

function ArrowUpRightIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3 w-3"
    >
      <path d="M7 7h10v10" />
      <path d="M7 17 17 7" />
    </svg>
  );
}

export function RoleCarousel({ roles }: { roles: LandingRole[] }) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  const updateScrollButtons = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    updateScrollButtons();
    window.addEventListener("resize", updateScrollButtons);
    return () => window.removeEventListener("resize", updateScrollButtons);
  }, [roles, updateScrollButtons]);

  const scrollCarousel = (direction: "left" | "right") => {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === "left" ? -320 : 320, behavior: "smooth" });
    setTimeout(updateScrollButtons, 300);
  };

  if (roles.length === 0) {
    return (
      <section className="sm:block">
        <h2 className="text-lg">Latest roles</h2>
        <div className="border-border/60 mt-4 rounded-xl border border-dashed px-4 py-12 text-center">
          <p className="text-muted-foreground text-sm">
            No open roles right now. Check back soon or sign in to get notified.
          </p>
          <button
            type="button"
            onClick={() => void signInWithGoogle("work")}
            className="text-primary mt-3 inline-block text-sm font-medium underline-offset-2 hover:underline"
          >
            Continue with Google
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="sm:block">
      <section className="@container flex flex-row items-center justify-between">
        <h2 className="text-lg">Latest roles</h2>
        <div className="flex flex-row items-center gap-6">
          <div className="flex flex-row items-center gap-2">
            <button
              type="button"
              disabled={!canScrollLeft}
              className={`rounded-md border border-canvas-soft p-1 transition-all hover:border-canvas-soft ${canScrollLeft ? "cursor-pointer bg-muted hover:bg-secondary" : "cursor-not-allowed"}`}
              onClick={() => scrollCarousel("left")}
            >
              <svg
                stroke="currentColor"
                fill="currentColor"
                strokeWidth="0"
                viewBox="0 0 512 512"
                className={`h-3.5 w-3.5 ${canScrollLeft ? "text-foreground" : "text-canvas-soft"}`}
                height="1em"
                width="1em"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="48"
                  d="M328 112 184 256l144 144"
                />
              </svg>
            </button>
            <button
              type="button"
              disabled={!canScrollRight}
              className={`rounded-md border border-canvas-soft p-1 transition-all hover:border-canvas-soft ${canScrollRight ? "cursor-pointer bg-muted hover:bg-secondary" : "cursor-not-allowed"}`}
              onClick={() => scrollCarousel("right")}
            >
              <svg
                stroke="currentColor"
                fill="currentColor"
                strokeWidth="0"
                viewBox="0 0 512 512"
                className={`h-3.5 w-3.5 ${canScrollRight ? "text-foreground" : "text-canvas-soft"}`}
                height="1em"
                width="1em"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="48"
                  d="m184 112 144 144-144 144"
                />
              </svg>
            </button>
          </div>
        </div>
      </section>

      <div
        ref={carouselRef}
        className="-ml-[1.5px] mt-4 snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        onScroll={updateScrollButtons}
      >
        <div className="grid auto-cols-[290px] grid-flow-col grid-rows-2 gap-5 p-[2px]">
          {roles.map((role) => {
            const avatars = avatarsForRole(role.id, role.title);
            return (
              <div key={role.id} className="w-[290px] snap-start">
                <button
                  type="button"
                  onClick={() => void signInWithGoogle("work")}
                  className="group ml-px flex h-[140px] w-full flex-col justify-between rounded-lg border border-foreground/7 bg-canvas bg-clip-padding p-4 pt-3 text-left shadow-sm ring-1 ring-transparent duration-200 hover:border-ring hover:bg-muted/50 hover:ring-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-transparent focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div>
                    <h3 className="line-clamp-1">{role.title}</h3>
                    <p className="mt-1 text-sm text-mute">{role.pay}</p>
                  </div>
                  <div className="flex w-full flex-row items-center justify-between gap-1">
                    <div className="flex min-w-1 flex-row items-center gap-2 text-sm">
                      <div
                        className="flex -space-x-1"
                        role="img"
                        aria-hidden="true"
                      >
                        {avatars.map((avatar) => (
                          <span
                            key={avatar.letter}
                            className={`flex size-5 items-center justify-center rounded-full border-2 border-canvas text-[8px] font-semibold text-canvas ${avatar.colorClass}`}
                          >
                            {avatar.letter}
                          </span>
                        ))}
                      </div>
                      <div className="text-xs text-mute">
                        {roleActivityLabel(role)}
                      </div>
                    </div>
                    <div className="flex flex-row items-center gap-1 text-mute group-hover:text-ring">
                      <div className="text-sm">Apply</div>
                      <div className="w-0 shrink-0 overflow-hidden duration-200 group-hover:w-[10px]">
                        <ArrowUpRightIcon />
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
