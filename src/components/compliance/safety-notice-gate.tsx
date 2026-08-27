"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getCandidateVoiceLanguageAction } from "@/lib/candidate/actions";
import { authClient } from "@/lib/auth/auth-client";
import {
  asTermsVersion,
  hasAcceptedPlatformTerms,
  toAcceptedAtIso,
} from "@/lib/user/preferences";
import { parseProfileType } from "@/lib/user/profile-types";

type Status = {
  pol0007Required: boolean;
  pol0005Required: boolean;
  openCase: boolean;
};

type Wording = {
  available: boolean;
  title?: string;
  body?: string;
  continueLabel?: string;
  needsHumanDelivery?: boolean;
};

/**
 * POL-0005 when a legal-review case is open. POL-0007 is recorded when the
 * first-load banner is stamped onto the account — not a second dialog.
 * Read and tap continue. This is not a test, and it is not consent (POL-0006).
 */
export function SafetyNoticeGate() {
  const { data: session } = authClient.useSession();
  const profileType = parseProfileType(session?.user?.profileType);
  const termsAccepted = hasAcceptedPlatformTerms(
    asTermsVersion(session?.user?.platformTermsVersion),
    toAcceptedAtIso(session?.user?.platformTermsAcceptedAt),
  );
  const [status, setStatus] = useState<Status | null>(null);
  const [wording, setWording] = useState<Wording | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState<string>("en-IN");

  const notice = status?.pol0005Required ? "POL-0005" : null;

  const refresh = useCallback(async () => {
    if (profileType !== "work" || !termsAccepted) {
      setStatus(null);
      return;
    }
    try {
      const res = await fetch("/api/candidate/safety/status");
      if (!res.ok) return;
      const json = (await res.json()) as Status;
      setStatus(json);
    } catch {
      /* ignore */
    }
  }, [profileType, termsAccepted]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 8000);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (profileType !== "work") return;
      const result = await getCandidateVoiceLanguageAction();
      if (!cancelled && result.ok && result.language) {
        setLanguage(result.language);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileType]);

  useEffect(() => {
    if (!notice) {
      setWording(null);
      setError("");
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/candidate/safety/notice?notice=${notice}&language_code=${encodeURIComponent(language)}`,
        );
        const json = (await res.json()) as Wording;
        if (!cancelled) setWording(json);
      } catch {
        if (!cancelled)
          setWording({ available: false, needsHumanDelivery: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notice, language]);

  const record = async () => {
    if (!notice || !wording?.available) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/candidate/safety/notice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notice,
          language_code: language,
        }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error || "Could not record the notice");
      }
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not record the notice");
    } finally {
      setSaving(false);
    }
  };

  if (profileType !== "work" || !termsAccepted || !notice) return null;

  const recordDeferred = async () => {
    if (!notice) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/candidate/safety/notice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notice,
          language_code: language,
        }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error || "Could not record the notice");
      }
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not record the notice");
    } finally {
      setSaving(false);
    }
  };

  const hindi = language.startsWith("hi");

  if (wording && !wording.available) {
    return (
      <Dialog open>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {hindi ? "कोई व्यक्ति आपसे बात करेगा" : "Someone will call you"}
            </DialogTitle>
            <DialogDescription>
              {hindi
                ? "यह सूचना आपकी भाषा में अभी तैयार नहीं है। हमारी टीम आपसे बात करेगी। आप ऐप इस्तेमाल कर सकते हैं।"
                : "We do not have this note in your language yet. Our team will talk to you. You can keep using the app."}
            </DialogDescription>
          </DialogHeader>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <DialogFooter>
            <Button
              type="button"
              disabled={saving}
              onClick={() => void recordDeferred()}
            >
              {saving
                ? hindi
                  ? "सेव हो रहा है…"
                  : "Saving…"
                : hindi
                  ? "ठीक है"
                  : "Okay"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (!wording?.available) return null;

  return (
    <Dialog open>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {wording.title ?? (hindi ? "यह पढ़ लीजिए" : "Please read this")}
          </DialogTitle>
          <DialogDescription className="whitespace-pre-line text-sm leading-relaxed">
            {wording.body}
          </DialogDescription>
        </DialogHeader>
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        <DialogFooter>
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={saving}
            onClick={() => void record()}
          >
            {saving
              ? hindi
                ? "सेव हो रहा है…"
                : "Saving…"
              : (wording.continueLabel ?? (hindi ? "ठीक है" : "Okay"))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
