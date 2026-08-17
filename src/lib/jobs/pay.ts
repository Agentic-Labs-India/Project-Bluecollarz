export const JOB_PAY_TYPES = ["hour", "weekly", "monthly", "task"] as const;
export type JobPayType = (typeof JOB_PAY_TYPES)[number];

export const DEFAULT_PAY_TYPE: JobPayType = "monthly";

export const JOB_PAY_TYPE_LABELS: Record<JobPayType, string> = {
  hour: "Hour",
  weekly: "Weekly",
  monthly: "Monthly",
  task: "Task",
};

const JOB_PAY_TYPE_SUFFIX: Record<JobPayType, string> = {
  hour: "hour",
  weekly: "week",
  monthly: "month",
  task: "task",
};

/** Digits and at most two decimal places. */
export function sanitizePayAmountInput(raw: string): string {
  const next = raw.replace(/[^\d.]/g, "");
  const dot = next.indexOf(".");
  if (dot === -1) return next;
  const whole = next.slice(0, dot).replace(/\./g, "");
  const fraction = next
    .slice(dot + 1)
    .replace(/\./g, "")
    .slice(0, 2);
  return next.endsWith(".") || fraction.length ? `${whole}.${fraction}` : whole;
}

export function formatJobPay(
  amount: number,
  currency: string,
  payType: JobPayType,
): string {
  const money = new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    currencyDisplay: "code",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${money} / ${JOB_PAY_TYPE_SUFFIX[payType]}`;
}
