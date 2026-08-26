"use client";

import { useEffect, useRef, useState } from "react";
import {
  fetchUserPreferences,
  patchUserPreferences,
} from "@/components/layout/preference-dialog";
import { authClient } from "@/lib/auth/auth-client";
import { hasAgreedToSite } from "@/lib/compliance/site-agreement";
import {
  asTermsVersion,
  hasAcceptedPlatformTerms,
  toAcceptedAtIso,
} from "@/lib/user/preferences";

const PLATFORM_TERMS_READY_EVENT = "blucollarz:platform-terms-ready";

function emitPlatformTermsReady() {
  window.dispatchEvent(new Event(PLATFORM_TERMS_READY_EVENT));
}

/**
 * Writes the first-load banner agreement (Privacy, Terms, 18+) onto the
 * signed-in user. Login is already blocked until that banner is accepted.
 * No second dialog — DPDP s.6(10) proof is the user timestamp, not another click.
 */
export async function stampPlatformTermsFromSiteAgreement(): Promise<boolean> {
  if (!hasAgreedToSite()) return false;
  const prefs = await fetchUserPreferences();
  if (!prefs.platformTermsAccepted) {
    await patchUserPreferences({ platformTermsAccepted: true });
  }
  await authClient.getSession();
  emitPlatformTermsReady();
  return true;
}

/**
 * Becomes true shortly after platform terms are on the account
 * (this session stamp, or a previous session).
 */
export function useAfterPlatformTerms(delayMs = 500) {
  const [live, setLive] = useState(false);
  const { data: session, isPending } = authClient.useSession();
  const sessionUser = session?.user as
    | {
        id?: string;
        platformTermsVersion?: number | string | null;
        platformTermsAcceptedAt?: Date | string | null;
      }
    | undefined;
  const userId = sessionUser?.id;
  const sessionTermsVersion = asTermsVersion(sessionUser?.platformTermsVersion);
  const sessionTermsAt = toAcceptedAtIso(sessionUser?.platformTermsAcceptedAt);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;

    const arm = () => {
      if (cancelled || timer) return;
      timer = window.setTimeout(() => {
        if (!cancelled) setLive(true);
      }, delayMs);
    };

    window.addEventListener(PLATFORM_TERMS_READY_EVENT, arm);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener(PLATFORM_TERMS_READY_EVENT, arm);
    };
  }, [delayMs]);

  useEffect(() => {
    if (live || isPending || !userId) return;

    if (hasAcceptedPlatformTerms(sessionTermsVersion, sessionTermsAt)) {
      emitPlatformTermsReady();
      return;
    }

    let cancelled = false;
    void fetchUserPreferences()
      .then((prefs) => {
        if (!cancelled && prefs.platformTermsAccepted) {
          emitPlatformTermsReady();
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [live, isPending, userId, sessionTermsVersion, sessionTermsAt]);

  return live;
}

/**
 * Silent binder. No UI. Stamps first-load site agreement onto the Users
 * document after Google, and records POL-0007 via the preferences PATCH.
 */
export function PlatformTermsGate() {
  const { data: session, isPending } = authClient.useSession();
  const inFlight = useRef(false);

  const sessionUser = session?.user as
    | {
        id?: string;
        platformTermsVersion?: number | string | null;
        platformTermsAcceptedAt?: Date | string | null;
      }
    | undefined;
  const userId = sessionUser?.id;
  const sessionTermsVersion = asTermsVersion(sessionUser?.platformTermsVersion);
  const sessionTermsAt = toAcceptedAtIso(sessionUser?.platformTermsAcceptedAt);

  useEffect(() => {
    if (isPending || !userId || inFlight.current) return;

    if (hasAcceptedPlatformTerms(sessionTermsVersion, sessionTermsAt)) {
      emitPlatformTermsReady();
      return;
    }

    if (!hasAgreedToSite()) return;

    inFlight.current = true;
    let cancelled = false;
    void stampPlatformTermsFromSiteAgreement()
      .catch(() => {
        inFlight.current = false;
      })
      .finally(() => {
        if (cancelled) inFlight.current = false;
      });

    return () => {
      cancelled = true;
    };
  }, [isPending, userId, sessionTermsVersion, sessionTermsAt]);

  return null;
}
