"use client";

import { ArrowLeftIcon, ArrowRightIcon, ArrowUpRightIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { LoginButton } from "@/components/auth/login-button";
import { PrimaryDitherBand } from "@/components/landing/primary-dither";
import { stateName } from "@/lib/core/geo/places";
import type { LandingRole } from "@/lib/jobs/queries";
import { cn } from "@/lib/utils";

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

function hashString(value: string) {
  return value.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function avatarsForRole(jobId: string, title: string): Avatar[] {
  const words = title.split(/\s+/).filter((word) => word.length > 1);
  const letters = [
    words[0]?.[0] ?? "A",
    words[1]?.[0] ?? words[0]?.[1] ?? "B",
    words[2]?.[0] ?? words[0]?.[2] ?? "C",
  ].map((letter) => letter.toUpperCase());

  const hash = hashString(jobId);

  return letters.map((letter, index) => ({
    letter,
    colorClass: AVATAR_COLORS[(hash + index) % AVATAR_COLORS.length],
  }));
}

function roleActivityLabel(role: LandingRole): string {
  if (role.applicantCount > 0) {
    return `${role.applicantCount} ${role.applicantCount === 1 ? "applicant" : "applicants"}`;
  }
  return "Be the first to apply";
}

function roleStateLabel(role: LandingRole): string {
  return stateName(role.countryCode, role.stateCode);
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
    el.scrollBy({
      left: direction === "left" ? -340 : 340,
      behavior: "smooth",
    });
    setTimeout(updateScrollButtons, 300);
  };

  const header = (
    <div className="max-w-2xl">
      <h2 className="font-heading text-foreground mt-3 text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
        Latest roles
      </h2>
      <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-relaxed sm:text-[15px]">
        Verified openings from recruiters hiring skilled workers abroad.
      </p>
    </div>
  );

  if (roles.length === 0) {
    return (
      <section className="sm:block">
        {header}
        <div className="border-primary/20 bg-primary/[0.03] mt-8 border border-dashed px-4 py-12 text-center sm:mt-10">
          <p className="text-muted-foreground text-sm">
            No open roles right now. Check back soon or sign in to get notified.
          </p>
          <LoginButton className="text-primary mt-3 inline-block text-sm font-medium underline-offset-2 hover:underline">
            Continue with Google
          </LoginButton>
        </div>
      </section>
    );
  }

  return (
    <section className="sm:block">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        {header}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!canScrollLeft}
            aria-label="Previous roles"
            className={cn(
              "border-primary/25 text-primary flex size-9 items-center justify-center border transition-colors",
              canScrollLeft
                ? "hover:bg-primary hover:text-primary-foreground cursor-pointer"
                : "cursor-not-allowed opacity-35",
            )}
            onClick={() => scrollCarousel("left")}
          >
            <ArrowLeftIcon className="size-4" />
          </button>
          <button
            type="button"
            disabled={!canScrollRight}
            aria-label="Next roles"
            className={cn(
              "border-primary/25 text-primary flex size-9 items-center justify-center border transition-colors",
              canScrollRight
                ? "hover:bg-primary hover:text-primary-foreground cursor-pointer"
                : "cursor-not-allowed opacity-35",
            )}
            onClick={() => scrollCarousel("right")}
          >
            <ArrowRightIcon className="size-4" />
          </button>
        </div>
      </div>

      <div
        ref={carouselRef}
        className="mt-6 snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] sm:mt-8 [&::-webkit-scrollbar]:hidden"
        onScroll={updateScrollButtons}
      >
        <div className="grid auto-cols-[300px] grid-flow-col grid-rows-2 gap-3 sm:auto-cols-[320px]">
          {roles.map((role) => {
            const avatars = avatarsForRole(role.id, role.title);
            const place = roleStateLabel(role);

            return (
              <div key={role.id} className="w-[300px] snap-start sm:w-[320px]">
                <Link
                  href={`/jobs/${role.id}`}
                  className="group border-border bg-card hover:border-primary/40 focus-visible:ring-primary relative flex h-[128px] w-full flex-col overflow-hidden border outline-none transition-[border-color] duration-200 focus-visible:ring-2 focus-visible:ring-offset-2"
                >
                  <PrimaryDitherBand
                    seed={role.id}
                    label={place || undefined}
                  />

                  <div className="flex min-h-0 flex-1 flex-col justify-between px-3 py-2.5">
                    <div>
                      <h3 className="font-heading text-foreground line-clamp-1 text-sm font-semibold tracking-tight">
                        {role.title}
                      </h3>
                      <p className="text-muted-foreground mt-0.5 text-[13px] font-medium tabular-nums">
                        {role.pay}
                      </p>
                    </div>

                    <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-primary/10 pt-1.5">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <div className="flex -space-x-1.5" aria-hidden>
                          {avatars.map((avatar) => (
                            <span
                              key={avatar.letter}
                              className={cn(
                                "border-card text-primary-foreground flex size-4 items-center justify-center border-2 text-[7px] font-semibold",
                                avatar.colorClass,
                              )}
                            >
                              {avatar.letter}
                            </span>
                          ))}
                        </div>
                        <span className="text-muted-foreground truncate text-[11px]">
                          {roleActivityLabel(role)}
                        </span>
                      </div>
                      <span className="text-primary inline-flex shrink-0 items-center gap-0.5 text-[11px] font-semibold tracking-wide uppercase">
                        View
                        <ArrowUpRightIcon className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
