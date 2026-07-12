"use client";

import React, { Suspense, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { CANDIDATE_NAV } from "@/lib/routes";

const isFullBleed = (pathname: string) =>
  pathname.startsWith("/candidate/explore") ||
  pathname.startsWith("/candidate/onboarding");

const hideMobileNav = (pathname: string) =>
  pathname.startsWith("/candidate/onboarding");

const isOnboardingExempt = (pathname: string) =>
  pathname.startsWith("/candidate/onboarding") ||
  pathname.startsWith("/candidate/settings");

/** Client-side backup gate — proxy also redirects, this catches SPA navigations. */
function OnboardingGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isOnboardingExempt(pathname)) return;

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/candidate/onboarding-status");
        if (!res.ok) return;
        const data = (await res.json()) as { complete?: boolean };
        if (!cancelled && data.complete === false) {
          router.replace("/candidate/onboarding");
        }
      } catch {
        // ignore — proxy is the primary gate
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return children;
}

export function CandidateShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AppShell
        items={CANDIDATE_NAV}
        homeHref="/candidate/home"
        profileHref="/candidate/profile"
        isFullBleed={isFullBleed}
        hideMobileNav={hideMobileNav}
      >
        <OnboardingGate>{children}</OnboardingGate>
      </AppShell>
    </Suspense>
  );
}
