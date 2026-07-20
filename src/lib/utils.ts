import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ZodError } from "zod";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Normalize ObjectId or hex/string id → string. */
export function idHex(id: unknown): string {
  if (typeof id === "string") return id;
  if (
    id &&
    typeof id === "object" &&
    "toHexString" in id &&
    typeof (id as { toHexString?: unknown }).toHexString === "function"
  ) {
    return (id as { toHexString: () => string }).toHexString();
  }
  if (typeof id === "number" && Number.isFinite(id)) return String(id);
  return String(id ?? "");
}

/** number | string → finite number, else fallback. */
export function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

/** Flatten a Zod error into a single message. */
export function formatZodError(error: ZodError): string {
  const messages = error.issues.map((issue) => {
    const path = issue.path.length ? `${issue.path.join(".")}: ` : "";
    return `${path}${issue.message}`;
  });
  return messages.length ? messages.join(". ") : "Validation failed";
}
