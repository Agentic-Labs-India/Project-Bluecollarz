"use client";

import { LoginButton } from "@/components/auth/login-button";
import { PrimaryDither } from "@/components/landing/primary-dither";
import { cn } from "@/lib/utils";

/** Primary CTA with shared live dither fill (nav Log in, hero Get Started). */
export function DitherLoginButton({
  children = "Log in",
  className,
  seed = "login-cta",
  onBeforeOpen,
}: {
  children?: React.ReactNode;
  className?: string;
  seed?: string;
  onBeforeOpen?: () => void;
}) {
  return (
    <LoginButton
      className={cn(
        "bg-primary relative inline-flex items-center justify-center overflow-hidden rounded-md px-6 py-2 text-white duration-200 hover:brightness-110",
        className,
      )}
      onBeforeOpen={onBeforeOpen}
    >
      <PrimaryDither
        seed={seed}
        opacity={0.92}
        wash={false}
        className="pointer-events-none absolute inset-0 overflow-hidden"
      />
      <span className="relative z-10">{children}</span>
    </LoginButton>
  );
}
