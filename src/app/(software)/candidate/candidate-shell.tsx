"use client";

import { usePathname } from "next/navigation";
import type React from "react";
import { Suspense } from "react";
import { PlatformTermsGate } from "@/components/compliance/platform-terms-gate";
import { SafetyNoticeGate } from "@/components/compliance/safety-notice-gate";
import { AppShell } from "@/components/layout/app-shell";
import { CANDIDATE_NAV } from "@/lib/core/routes";

const isFullBleed = (pathname: string) =>
  pathname.startsWith("/candidate/explore") ||
  pathname.startsWith("/candidate/onboarding") ||
  pathname.startsWith("/candidate/kyc");

const hideMobileNav = (pathname: string) =>
  pathname.startsWith("/candidate/onboarding") ||
  pathname.startsWith("/candidate/kyc") ||
  pathname.startsWith("/candidate/medical");

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
        {children}
        <PlatformTermsGate />
        <SafetyNoticeGate />
      </AppShell>
    </Suspense>
  );
}
