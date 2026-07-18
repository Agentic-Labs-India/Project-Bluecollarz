import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Shared page header + content width for landing marketing pages. */
export function MarketingPage({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <main
      className={cn(
        "mx-auto w-full max-w-5xl px-6 pb-8 pt-28 md:px-8 md:pt-32",
        className,
      )}
    >
      <header className="max-w-2xl space-y-3">
        {eyebrow ? (
          <p className="text-mute text-sm font-medium tracking-wide uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-foreground text-3xl font-semibold tracking-tight md:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="text-muted-foreground text-base leading-relaxed">
            {description}
          </p>
        ) : null}
      </header>
      <div className="text-muted-foreground mt-10 max-w-3xl space-y-6 text-sm leading-relaxed md:text-[15px]">
        {children}
      </div>
    </main>
  );
}

export function MarketingSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-foreground text-lg font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function MarketingCta({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  const className =
    "bg-primary text-primary-foreground hover:bg-primary-active inline-flex items-center justify-center rounded-md px-6 py-2.5 text-sm font-medium transition-colors";

  if (href.startsWith("mailto:")) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
