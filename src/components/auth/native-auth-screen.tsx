"use client";

import Image from "next/image";
import { useState } from "react";
import { AuthReturnNotice } from "@/components/auth/auth-return-notice";
import { DIGILOCKER_START_PATH } from "@/components/auth/login-button";
import { SiteAgreementPanel } from "@/components/compliance/site-agreement-panel";

export function NativeAuthScreen() {
  const [continuing, setContinuing] = useState(false);

  return (
    <main className="bg-canvas text-foreground flex h-dvh min-h-dvh w-full flex-col items-center justify-center px-6 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <AuthReturnNotice />
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <Image
          src="/logo.svg"
          alt=""
          width={48}
          height={48}
          className="size-12"
          priority
        />
        <h1 className="font-serif mt-5 text-3xl tracking-tight">Blucollarz</h1>
        <p className="text-mute mt-2 text-sm leading-snug">
          Welcome to Blucollarz. Trusted Beyond Borders. Please sign in to continue.
        </p>
        <div className="mt-8 w-full">
          <SiteAgreementPanel
            variant="inline"
            onContinue={() => {
              if (continuing) return;
              setContinuing(true);
              window.location.assign(DIGILOCKER_START_PATH);
            }}
          />
        </div>
      </div>
    </main>
  );
}
