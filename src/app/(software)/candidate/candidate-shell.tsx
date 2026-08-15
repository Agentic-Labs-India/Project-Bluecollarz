"use client";

import { usePathname, useRouter } from "next/navigation";
import type React from "react";
import { Suspense, useEffect } from "react";
import { PlatformTermsGate } from "@/components/compliance/platform-terms-gate";
import { AppShell } from "@/components/layout/app-shell";
import { CANDIDATE_NAV } from "@/lib/core/routes";

const isFullBleed = (pathname: string) =>
  pathname.startsWith("/candidate/explore") ||
  pathname.startsWith("/candidate/onboarding");

const hideMobileNav = (pathname: string) =>
  pathname.startsWith("/candidate/onboarding") ||
  pathname.startsWith("/candidate/kyc");

const isPreAppExempt = (pathname: string) =>
  pathname.startsWith("/candidate/onboarding") ||
  pathname.startsWith("/candidate/kyc") ||
  pathname.startsWith("/candidate/settings");

/** Client-side backup gate — proxy also redirects, this catches SPA navigations. */
function CandidateProgressGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isPreAppExempt(pathname)) return;

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/candidate/onboarding-status");
        if (!res.ok) return;
        const data = (await res.json()) as {
          complete?: boolean;
          kycVerified?: boolean;
        };
        if (cancelled) return;
        if (data.complete === false) {
          router.replace("/candidate/onboarding");
          return;
        }
        if (data.kycVerified === false) {
          router.replace("/candidate/kyc");
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
        <CandidateProgressGate>{children}</CandidateProgressGate>
        <PlatformTermsGate />
      </AppShell>
    </Suspense>
  );
}
