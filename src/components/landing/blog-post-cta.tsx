"use client";

import { LoginButton } from "@/components/auth/login-button";

/** Sticky left rail — opportunity copy + login CTA. */
export function BlogPostCta() {
  return (
    <aside className="lg:sticky lg:top-28">
      <div className="border-border space-y-3 border-b pb-6 lg:pb-8">
        <p className="text-mute text-[11px] font-medium tracking-[0.14em] uppercase">
          Opportunity
        </p>
        <p className="text-foreground text-[17px] font-medium leading-snug tracking-tight">
          Get Job in US, UK, UAE and more
        </p>
      </div>

      <div className="pt-6 lg:pt-8">
        <LoginButton className="bg-primary text-primary-foreground hover:bg-primary-active inline-flex items-center justify-center rounded-md px-5 py-2.5 text-sm font-medium transition-colors">
          Get Started
        </LoginButton>
      </div>
    </aside>
  );
}
