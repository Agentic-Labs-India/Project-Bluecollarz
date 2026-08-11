import type { ReactNode } from "react";
import Link from "next/link";
import { DocTocNav, type DocTocItem } from "@/components/landing/doc-toc";
import { PrimaryDither } from "@/components/landing/primary-dither";
import { cn } from "@/lib/utils";

/** Long-form document shell for About / Mission / Vision / Recruiters / Contact. */
export function DocPage({
  eyebrow,
  title,
  description,
  updated,
  toc,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  updated?: string;
  toc?: DocTocItem[];
  children: ReactNode;
  className?: string;
}) {
  return (
    <main
      className={cn(
        "mx-auto w-full max-w-6xl px-4 pb-16 pt-24 sm:px-6 sm:pt-28 md:px-8 md:pb-24 md:pt-32",
        className,
      )}
    >
      <header className="border-border max-w-3xl space-y-4 border-b pb-8 md:pb-10">
        {eyebrow ? (
          <p className="text-mute text-xs font-medium tracking-[0.14em] uppercase sm:text-sm">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-heading text-foreground text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl md:leading-[1.1]">
          {title}
        </h1>
        <p className="text-muted-foreground text-base leading-relaxed sm:text-lg">
          {description}
        </p>
        {updated ? (
          <p className="text-mute text-xs sm:text-sm">Last updated {updated}</p>
        ) : null}
      </header>

      <div
        className={cn(
          "mt-8 md:mt-12",
          toc?.length
            ? "lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start lg:gap-10 xl:grid-cols-[240px_minmax(0,1fr)] xl:gap-14"
            : null,
        )}
      >
        {toc?.length ? <DocTocNav items={toc} /> : null}

        <article className="text-muted-foreground min-w-0 max-w-3xl space-y-12 text-sm leading-relaxed sm:space-y-14 sm:text-[15px] md:space-y-16">
          {children}
        </article>
      </div>
    </main>
  );
}

export function DocSection({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 space-y-4 sm:scroll-mt-32">
      <div className="space-y-1.5">
        {number ? (
          <p className="text-primary text-xs font-semibold tracking-[0.14em] uppercase">
            {number}
          </p>
        ) : null}
        <h2 className="font-heading text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
          {title}
        </h2>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function DocCallout({
  title,
  children,
  className,
  variant = "dither",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  variant?: "default" | "dither";
}) {
  if (variant === "dither") {
    return (
      <aside
        className={cn(
          "bg-primary relative space-y-2 overflow-hidden border border-white/15 px-4 py-4 sm:px-5 sm:py-5",
          className,
        )}
      >
        <PrimaryDither seed={`doc-callout-${title ?? "note"}`} opacity={0.7} />
        {title ? (
          <p className="relative z-10 text-sm font-semibold text-white">
            {title}
          </p>
        ) : null}
        <div className="relative z-10 space-y-3 text-sm leading-relaxed text-white/80">
          {children}
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        "border-border bg-muted/35 space-y-2 border px-4 py-4 sm:px-5 sm:py-5",
        className,
      )}
    >
      {title ? (
        <p className="text-foreground text-sm font-semibold">{title}</p>
      ) : null}
      <div className="space-y-3 text-sm leading-relaxed">{children}</div>
    </aside>
  );
}

export function DocFeatureGrid({
  items,
}: {
  items: { title: string; body: string }[];
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <li
          key={item.title}
          className="bg-primary relative space-y-1.5 overflow-hidden border border-white/15 p-4"
        >
          <PrimaryDither seed={`doc-feature-${item.title}`} opacity={0.7} />
          <p className="relative z-10 text-sm font-semibold text-white">
            {item.title}
          </p>
          <p className="relative z-10 text-sm leading-relaxed text-white/75">
            {item.body}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function DocSteps({
  steps,
}: {
  steps: { title: string; body: string }[];
}) {
  return (
    <ol className="space-y-0">
      {steps.map((step, index) => (
        <li
          key={step.title}
          className="border-border flex gap-3 border-b py-4 first:pt-0 last:border-b-0 last:pb-0 sm:gap-4"
        >
          <span className="text-primary font-heading w-7 shrink-0 text-sm font-semibold tabular-nums">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0 space-y-1">
            <p className="text-foreground text-sm font-semibold">{step.title}</p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {step.body}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function DocTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="bg-primary relative -mx-1 overflow-hidden border border-white/15 sm:mx-0">
      <PrimaryDither seed={`doc-table-${headers.join("-")}`} opacity={0.65} />
      <div className="relative z-10 overflow-x-auto">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead className="bg-white/10">
            <tr>
              {headers.map((header) => (
                <th
                  key={header}
                  className="px-3 py-2.5 font-semibold whitespace-nowrap text-white"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t border-white/15">
                {row.map((cell, cellIndex) => (
                  <td
                    key={`${rowIndex}-${cellIndex}`}
                    className="px-3 py-2.5 align-top text-white/80"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DocList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 ps-5">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

export function DocCta({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  const className = cn(
    "inline-flex items-center justify-center rounded-md px-5 py-2.5 text-sm font-medium transition-colors",
    variant === "primary"
      ? "bg-primary text-primary-foreground hover:bg-primary-active"
      : "bg-muted text-foreground hover:bg-secondary",
  );

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

export function DocCtaRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">{children}</div>
  );
}

/** Screenshot / diagram with optional caption for how-to sections. */
export function DocFigure({
  src,
  alt,
  caption,
}: {
  src: string;
  alt: string;
  caption?: string;
}) {
  return (
    <figure className="border-border space-y-0 overflow-hidden border">
      <div className="bg-muted/25 relative aspect-[16/10] w-full">
        {/* Public marketing screenshots — plain img keeps layout stable before assets land. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="absolute inset-0 h-full w-full object-contain object-top"
        />
      </div>
      {caption ? (
        <figcaption className="text-mute border-border border-t px-3 py-2.5 text-xs leading-relaxed sm:px-4 sm:text-sm">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

export function DocContactCard({
  title,
  email,
  body,
  href,
  cta,
}: {
  title: string;
  email: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="bg-primary relative flex h-full flex-col gap-3 overflow-hidden border border-white/15 p-4 sm:p-5">
      <PrimaryDither seed={`doc-contact-${title}`} opacity={0.7} />
      <div className="relative z-10 space-y-1">
        <p className="text-sm font-semibold text-white">{title}</p>
        <a
          href={`mailto:${email}`}
          className="text-sm text-white underline underline-offset-4"
        >
          {email}
        </a>
      </div>
      <p className="relative z-10 flex-1 text-sm leading-relaxed text-white/75">
        {body}
      </p>
      <div className="relative z-10">
        <DocCta href={href} variant="secondary">
          {cta}
        </DocCta>
      </div>
    </div>
  );
}
