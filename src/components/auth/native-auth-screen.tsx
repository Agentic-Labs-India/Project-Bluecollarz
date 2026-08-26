"use client";

import Image from "next/image";
import { SiteAgreementPanel } from "@/components/compliance/site-agreement-panel";
import { DitherLoginButton } from "@/components/landing/dither-login-button";

export function NativeAuthScreen() {
  return (
    <main className="bg-canvas text-foreground flex h-dvh min-h-dvh w-full flex-col items-center justify-center px-6 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))]">
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
          Sign in to continue. New accounts are created as candidates.
        </p>
        <div className="mt-8 w-full">
          <SiteAgreementPanel variant="inline" />
        </div>
        <DitherLoginButton
          seed="auth-sign-in"
          className="mt-6 w-full px-8 py-2.5"
        >
          Continue with Google
        </DitherLoginButton>
      </div>
    </main>
  );
}
