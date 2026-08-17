/** Medical appointments are scheduled on India Standard Time (UTC+5:30, no DST). */

export const MEDICAL_TIMEZONE = "Asia/Kolkata";
export const MEDICAL_UTC_OFFSET = "+05:30";

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_HM = /^(\d{2}):(\d{2})$/;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Clock options for center hours (06:00–21:00 IST). */
export const MEDICAL_CLOCK_TIMES: readonly string[] = (() => {
  const slots: string[] = [];
  for (let hour = 6; hour <= 21; hour += 1) {
    for (const minute of [0, 30]) {
      if (hour === 21 && minute === 30) continue;
      slots.push(`${pad2(hour)}:${pad2(minute)}`);
    }
  }
  return slots;
})();

export const MEDICAL_WEEKDAY_SHORT = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

export const DEFAULT_OPERATING_DAYS = [1, 2, 3, 4, 5, 6] as const;
export const DEFAULT_OPEN_TIME = "09:00";
export const DEFAULT_CLOSE_TIME = "17:30";

export const YMD_RE = DATE_ONLY;
export const HM_RE = TIME_HM;

/** Canonical operating window. Stored on centers as days/open/close fields. */
export type MedicalHours = {
  days: number[];
  open: string;
  close: string;
};

function isHm(value: string): boolean {
  return TIME_HM.test(value);
}

export function minutesFromHm(value: string): number {
  const match = value.match(TIME_HM);
  if (!match) return Number.NaN;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Open-inclusive, last slot starts 30 minutes before close. */
export function slotTimesBetween(open: string, close: string): string[] {
  const start = minutesFromHm(open);
  const end = minutesFromHm(close);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end - start < 30) {
    return [];
  }
  const slots: string[] = [];
  for (let minutes = start; minutes + 30 <= end; minutes += 30) {
    slots.push(`${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`);
  }
  return slots;
}

function normalizeOperatingDays(value: unknown): number[] {
  if (!Array.isArray(value)) return [...DEFAULT_OPERATING_DAYS];
  const days = [
    ...new Set(
      value.filter(
        (day): day is number =>
          typeof day === "number" &&
          Number.isInteger(day) &&
          day >= 0 &&
          day <= 6,
      ),
    ),
  ].sort((a, b) => a - b);
  return days.length ? days : [...DEFAULT_OPERATING_DAYS];
}

function normalizeOpenTime(value: unknown): string {
  return typeof value === "string" && isHm(value) ? value : DEFAULT_OPEN_TIME;
}

function normalizeCloseTime(value: unknown): string {
  return typeof value === "string" && isHm(value) ? value : DEFAULT_CLOSE_TIME;
}

/** IST weekday 0=Sun … 6=Sat for a `yyyy-MM-dd` calendar day. */
function istWeekdayIndex(ymd: string): number {
  const noon = medicalWallToUtc(ymd, "12:00");
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone: MEDICAL_TIMEZONE,
    weekday: "short",
  }).format(noon);
  const index = MEDICAL_WEEKDAY_SHORT.indexOf(
    label as (typeof MEDICAL_WEEKDAY_SHORT)[number],
  );
  return index < 0 ? noon.getUTCDay() : index;
}

export function toMedicalHours(input?: {
  days?: unknown;
  open?: unknown;
  close?: unknown;
  operatingDays?: unknown;
  openTime?: unknown;
  closeTime?: unknown;
}): MedicalHours {
  return {
    days: normalizeOperatingDays(input?.days ?? input?.operatingDays),
    open: normalizeOpenTime(input?.open ?? input?.openTime),
    close: normalizeCloseTime(input?.close ?? input?.closeTime),
  };
}

export function isOperatingDay(ymd: string, days: readonly number[]): boolean {
  return days.includes(istWeekdayIndex(ymd));
}

export function formatClock(hm: string): string {
  const minutes = minutesFromHm(hm);
  if (!Number.isFinite(minutes)) return hm;
  const parsed = new Date(`1970-01-01T${hm}:00${MEDICAL_UTC_OFFSET}`);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: MEDICAL_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(parsed);
}

function formatOperatingDays(days: readonly number[]): string {
  const unique = [...new Set(days)].sort((a, b) => a - b);
  if (!unique.length) return "Closed";
  const labels = unique.map((day) => MEDICAL_WEEKDAY_SHORT[day]);
  const consecutive = unique.every(
    (day, index) => index === 0 || day === unique[index - 1] + 1,
  );
  if (consecutive && unique.length > 2) {
    return `${labels[0]}–${labels[labels.length - 1]}`;
  }
  return labels.join(", ");
}

function formatOperatingHours(open: string, close: string): string {
  return `${formatClock(open)} – ${formatClock(close)} IST`;
}

export function formatOperatingSummary(hours: MedicalHours): string {
  return `${formatOperatingDays(hours.days)} · ${formatOperatingHours(hours.open, hours.close)}`;
}

export function availableSlotTimes(opts: {
  date: string;
  hours: MedicalHours;
  taken?: readonly string[];
  now?: Date;
}): string[] {
  if (!isOperatingDay(opts.date, opts.hours.days)) return [];
  const taken = new Set(opts.taken ?? []);
  const today = medicalTodayYmd(opts.now);
  const nowTime = utcToMedicalParts(opts.now ?? new Date()).time;
  return slotTimesBetween(opts.hours.open, opts.hours.close).filter((slot) => {
    if (taken.has(slot)) return false;
    if (opts.date < today) return false;
    if (opts.date === today && slot <= nowTime) return false;
    return true;
  });
}

export function medicalWallToUtc(date: string, time: string): Date {
  if (!DATE_ONLY.test(date) || !TIME_HM.test(time)) {
    throw new Error("Invalid date or time");
  }
  const parsed = new Date(`${date}T${time}:00${MEDICAL_UTC_OFFSET}`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid date or time");
  }
  return parsed;
}

export function utcToMedicalParts(value: Date): { date: string; time: string } {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: MEDICAL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(value).map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

/** IST wall-clock range for a calendar day; `to` is exclusive. */
export function medicalDayRangeUtc(date: string): { from: Date; to: Date } {
  const from = medicalWallToUtc(date, "00:00");
  const next = new Date(from.getTime() + 24 * 60 * 60 * 1000);
  return { from, to: next };
}

/** Optional IST date bounds as UTC `Date`s. `to` is exclusive (start of next day). */
export function medicalOptionalDateSpanUtc(
  fromDate?: string,
  toDate?: string,
): { from?: Date; to?: Date } | null {
  if (!fromDate && !toDate) return null;
  return {
    from: fromDate ? medicalWallToUtc(fromDate, "00:00") : undefined,
    to: toDate ? medicalDayRangeUtc(toDate).to : undefined,
  };
}

export function medicalTodayYmd(now = new Date()): string {
  return utcToMedicalParts(now).date;
}

export function formatMedicalDateTime(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: MEDICAL_TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(parsed);
}
