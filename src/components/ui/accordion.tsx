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
  value,
  onValueChange,
  className,
  children,
}: {
  type?: "single" | "multiple";
  /** Values open by default (uncontrolled). */
  defaultValue?: string[];
  /** Controlled open values. */
  value?: string[];
  onValueChange?: (next: string[]) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const [uncontrolled, setUncontrolled] = React.useState<Set<string>>(
    () => new Set(defaultValue ?? []),
  );
  const controlled = value !== undefined;
  const open = controlled ? new Set(value) : uncontrolled;

  const toggle = React.useCallback(
    (item: string) => {
      const apply = (prev: Set<string>) => {
        const next = new Set(prev);
        if (next.has(item)) {
          next.delete(item);
        } else {
          if (type === "single") next.clear();
          next.add(item);
        }
        return next;
      };

      if (controlled) {
        onValueChange?.([...apply(new Set(value ?? []))]);
        return;
      }
      setUncontrolled((prev) => apply(prev));
    },
    [controlled, onValueChange, type, value],
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
  const ctx = React.useContext(AccordionContext);
  const isOpen = Boolean(ctx?.open.has(value));

  return (
    <ItemContext.Provider value={value}>
      <div
        data-state={isOpen ? "open" : "closed"}
        className={cn("border-border", className)}
      >
        {children}
      </div>
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
      data-state={isOpen ? "open" : "closed"}
      onClick={() => ctx.toggle(value)}
    >
      <span className="min-w-0 flex-1">{children}</span>
      <ChevronDownIcon
        className={cn(
          "text-muted-foreground size-4 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
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
  const isOpen = ctx.open.has(value);

  return (
    <div
      data-state={isOpen ? "open" : "closed"}
      className={cn(
        "grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
        isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
      )}
    >
      <div className="overflow-hidden">
        <div
          className={cn(
            "text-muted-foreground pb-4 text-sm transition-opacity duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
            isOpen ? "opacity-100" : "opacity-0",
            className,
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
