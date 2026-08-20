"use client";

import type { ComponentProps } from "react";
import { PrimaryDither } from "@/components/landing/primary-dither";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DitherButton({
  children,
  className,
  seed = "dither-button",
  ...props
}: ComponentProps<typeof Button> & { seed?: string }) {
  return (
    <Button
      className={cn(
        "bg-primary relative overflow-hidden text-white hover:brightness-110",
        className,
      )}
      {...props}
    >
      <PrimaryDither
        seed={seed}
        opacity={0.92}
        wash={false}
        className="pointer-events-none absolute inset-0 overflow-hidden"
      />
      <span className="relative z-10 inline-flex items-center justify-center gap-1.5">
        {children}
      </span>
    </Button>
  );
}
