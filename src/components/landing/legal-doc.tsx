import type { ReactNode } from "react";

export function LegalDoc({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <article className="space-y-8">
      <header className="max-w-2xl space-y-3">
        <p className="text-mute text-sm font-medium tracking-wide uppercase">
          Legal
        </p>
        <h1 className="text-foreground text-3xl font-semibold tracking-tight md:text-4xl">
          {title}
        </h1>
        <p className="text-muted-foreground text-sm">Last updated {updated}</p>
      </header>
      <div className="legal-prose text-muted-foreground max-w-3xl space-y-6 text-sm leading-relaxed md:text-[15px]">
        {children}
      </div>
    </article>
  );
}

export function LegalSection({
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
