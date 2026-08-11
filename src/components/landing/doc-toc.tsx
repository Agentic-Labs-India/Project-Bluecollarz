"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type DocTocItem = { id: string; label: string };

/** Sticky “On this page” nav with primary active state + left bullet. */
export function DocTocNav({ items }: { items: DocTocItem[] }) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");

  useEffect(() => {
    if (!items.length) return;

    const nodes = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (!nodes.length) return;

    const visible = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id;
          if (entry.isIntersecting) {
            visible.set(id, entry.intersectionRatio);
          } else {
            visible.delete(id);
          }
        }

        if (visible.size === 0) return;

        let next = items[0]?.id ?? "";
        let top = Number.POSITIVE_INFINITY;
        for (const item of items) {
          if (!visible.has(item.id)) continue;
          const el = document.getElementById(item.id);
          if (!el) continue;
          const y = el.getBoundingClientRect().top;
          if (y < top) {
            top = y;
            next = item.id;
          }
        }
        setActiveId(next);
      },
      {
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0, 0.1, 0.25, 0.5, 1],
      },
    );

    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, [items]);

  return (
    <aside className="border-border mb-8 border-b pb-6 lg:sticky lg:top-24 lg:mb-0 lg:border-b-0 lg:pb-0">
      <p className="text-mute mb-3 text-[11px] font-medium tracking-[0.12em] uppercase">
        On this page
      </p>
      <nav
        aria-label="Page sections"
        className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0"
      >
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              aria-current={active ? "location" : undefined}
              className={cn(
                "relative shrink-0 rounded-md py-1.5 pr-2.5 pl-5 text-sm whitespace-nowrap transition-colors lg:whitespace-normal",
                active
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground font-normal",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "absolute top-1/2 left-1.5 size-1.5 -translate-y-1/2 rounded-full transition-colors",
                  active ? "bg-primary" : "bg-transparent",
                )}
              />
              {item.label}
            </a>
          );
        })}
      </nav>
    </aside>
  );
}
