"use client";

import { usePathname, useRouter } from "next/navigation";
import type React from "react";
import { Suspense, useEffect } from "react";
import { PlatformTermsGate } from "@/components/compliance/platform-terms-gate";
import { AppShell } from "@/components/layout/app-shell";
import { HIRE_NAV } from "@/lib/core/routes";

const isOnboarding = (pathname: string) =>
  pathname.startsWith("/hire/onboarding");

const isPreAppExempt = (pathname: string) =>
  isOnboarding(pathname) || pathname.startsWith("/hire/settings");

/** Client-side backup gate — proxy also redirects, this catches SPA navigations. */
function HireProgressGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isPreAppExempt(pathname) && !isOnboarding(pathname)) return;

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/hire/onboarding-status");
        if (!res.ok) return;
        const data = (await res.json()) as { complete?: boolean };
        if (cancelled) return;
        if (data.complete === true && isOnboarding(pathname)) {
          router.replace("/hire/roles");
          return;
        }
        if (data.complete === false && !isPreAppExempt(pathname)) {
          router.replace("/hire/onboarding");
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

export function HireShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AppShell
        items={HIRE_NAV}
        homeHref="/hire/roles"
        profileHref="/hire/profile"
        hideMobileNav={isOnboarding}
      >
        <HireProgressGate>{children}</HireProgressGate>
        <PlatformTermsGate />
      </AppShell>
    </Suspense>
  );
}
