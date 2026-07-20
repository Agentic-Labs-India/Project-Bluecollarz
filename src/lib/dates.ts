/**
 * Calendar dates as MongoDB Date (UTC midnight).
 * JSON/UI wire format: `yyyy-MM-dd`.
 */

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** UTC midnight for a calendar day, or null. */
export function parseDateOnly(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    if (
      value.getUTCHours() === 0 &&
      value.getUTCMinutes() === 0 &&
      value.getUTCSeconds() === 0 &&
      value.getUTCMilliseconds() === 0
    ) {
      return new Date(
        Date.UTC(
          value.getUTCFullYear(),
          value.getUTCMonth(),
          value.getUTCDate(),
        ),
      );
    }
    return new Date(
      Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()),
    );
  }

  if (typeof value === "string") {
    const match = value.trim().match(DATE_ONLY);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }
    return date;
  }

  return null;
}

/** Local midnight Date for calendar UI. */
export function dateOnlyToLocalDate(value: unknown): Date | undefined {
  const date = parseDateOnly(value);
  if (!date) return undefined;
  return new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
}

/** `yyyy-MM-dd` or "". */
export function formatDateOnly(value: unknown): string {
  const date = parseDateOnly(value);
  if (!date) return "";
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

/** e.g. "May 15, 1990". */
export function formatDateOnlyDisplay(value: unknown): string {
  const date = parseDateOnly(value);
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
