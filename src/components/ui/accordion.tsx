"use client";

import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type AccordionContextValue = {
  open: Set<string>;
  toggle: (value: string) => void;
  type: "single" | "multiple";
};

const AccordionContext = React.createContext<AccordionContextValue | null>(
  null,
);

export function Accordion({
  type = "multiple",
  defaultValue,
  className,
  children,
}: {
  type?: "single" | "multiple";
  /** Values open by default. */
  defaultValue?: string[];
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState<Set<string>>(
    () => new Set(defaultValue ?? []),
  );

  const toggle = React.useCallback(
    (value: string) => {
      setOpen((prev) => {
        const next = new Set(prev);
        if (next.has(value)) {
          next.delete(value);
        } else {
          if (type === "single") next.clear();
          next.add(value);
        }
        return next;
      });
    },
    [type],
  );

  return (
    <AccordionContext.Provider value={{ open, toggle, type }}>
      <div className={cn("divide-border divide-y", className)}>{children}</div>
    </AccordionContext.Provider>
  );
}

const ItemContext = React.createContext<string>("");

export function AccordionItem({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <ItemContext.Provider value={value}>
      <div className={cn("border-border", className)}>{children}</div>
    </ItemContext.Provider>
  );
}

export function AccordionTrigger({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(AccordionContext);
  const value = React.useContext(ItemContext);
  if (!ctx) throw new Error("AccordionTrigger must be used within Accordion");
  const isOpen = ctx.open.has(value);

  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center justify-between gap-3 py-4 text-left text-sm font-medium transition-colors hover:underline",
        className,
      )}
      aria-expanded={isOpen}
      onClick={() => ctx.toggle(value)}
    >
      <span className="min-w-0 flex-1">{children}</span>
      <ChevronDownIcon
        className={cn(
          "text-muted-foreground size-4 shrink-0 transition-transform",
          isOpen && "rotate-180",
        )}
      />
    </button>
  );
}

export function AccordionContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(AccordionContext);
  const value = React.useContext(ItemContext);
  if (!ctx) throw new Error("AccordionContent must be used within Accordion");
  if (!ctx.open.has(value)) return null;

  return (
    <div className={cn("text-muted-foreground pb-4 text-sm", className)}>
      {children}
    </div>
  );
}
