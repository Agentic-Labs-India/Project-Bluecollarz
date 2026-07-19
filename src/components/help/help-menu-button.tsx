"use client";

import { CircleHelpIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Rail control — sits above cookie preferences. */
export function HelpMenuButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "text-muted-foreground hover:text-foreground rounded-lg p-2 transition-colors",
        className,
      )}
      aria-label="Help"
      onClick={onClick}
    >
      <CircleHelpIcon className="size-4" strokeWidth={1.75} />
    </button>
  );
}
