"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import {
  applyGtagConsent,
  isAnalyticsGranted,
} from "@/lib/compliance/analytics";

const GA_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;

/**
 * Loads gtag unless the person explicitly rejected analytics.
 */
export function AnalyticsScripts() {
  const [allowed, setAllowed] = useState(true);

  useEffect(() => {
    const sync = () => {
      const granted = isAnalyticsGranted();
      setAllowed(granted);
      applyGtagConsent(granted);
    };
    sync();
    const onChange = () => sync();
    window.addEventListener("blucollarz:analytics-consent", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("blucollarz:analytics-consent", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  if (!GA_ID || !allowed) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
