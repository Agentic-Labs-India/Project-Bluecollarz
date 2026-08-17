import { type ClassValue, clsx } from "clsx";
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

/** Env/JSON → positive integer, else fallback. */
export function asPositiveInt(value: unknown, fallback: number): number {
  const n = asNumber(value, Number.NaN);
  if (!Number.isInteger(n) || n <= 0) return fallback;
  return n;
}

/**
 * Keys for fixed-length placeholder lists such as loading skeletons.
 *
 * Position is the identity for these: the list never reorders, filters or
 * grows, so there is nothing else to key on. Mapping over the keys rather than
 * over a blank array keeps that intent explicit at each call site.
 */
export function placeholderKeys(count: number, prefix = "sk"): string[] {
  return Array.from({ length: count }, (_, index) => `${prefix}-${index}`);
}

/** Flatten a Zod error into a single message. */
export function formatZodError(error: ZodError): string {
  const messages = error.issues.map((issue) => {
    const path = issue.path.length ? `${issue.path.join(".")}: ` : "";
    return `${path}${issue.message}`;
  });
  return messages.length ? messages.join(". ") : "Validation failed";
}
