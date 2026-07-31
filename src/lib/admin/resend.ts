import "server-only";

import { Resend } from "resend";

/** Prefer RESEND_API_KEY; RESEND_API accepted as an alias. */
export function getResendApiKey(): string | null {
  const key =
    process.env.RESEND_API_KEY?.trim() || process.env.RESEND_API?.trim();
  return key || null;
}

/** Verified sender address, e.g. hello@yourdomain.com */
export function getResendFromEmail(): string | null {
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  return from || null;
}

export function getResendClient(): Resend | null {
  const key = getResendApiKey();
  if (!key) return null;
  return new Resend(key);
}

/** Friendly From header: `Ada Lovelace <hello@domain.com>`. */
export function formatSenderFrom(name: string | null | undefined, email: string) {
  const cleanName = (name ?? "").replace(/[<>\n\r]/g, "").trim();
  if (!cleanName) return email;
  return `${cleanName} <${email}>`;
}

export type AdminEmailListItem = {
  id: string;
  subject: string;
  from: string;
  to: string[];
  createdAt: string | null;
  lastEvent?: string | null;
};

export type AdminEmailDetail = AdminEmailListItem & {
  html: string | null;
  text: string | null;
  cc: string[];
  bcc: string[];
  replyTo: string[];
};

export function asStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((v) => String(v)).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const s = String(value).trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toISOString();
}

export function mapSentListItem(row: {
  id: string;
  subject?: string | null;
  from?: string | null;
  to?: string[] | string | null;
  created_at?: string | Date | null;
  last_event?: string | null;
}): AdminEmailListItem {
  return {
    id: row.id,
    subject: row.subject?.trim() || "(no subject)",
    from: row.from ?? "",
    to: asStringArray(row.to),
    createdAt: toIso(row.created_at),
    lastEvent: row.last_event ?? null,
  };
}

export function mapReceivedListItem(row: {
  id: string;
  subject?: string | null;
  from?: string | null;
  to?: string[] | string | null;
  created_at?: string | Date | null;
}): AdminEmailListItem {
  return {
    id: row.id,
    subject: row.subject?.trim() || "(no subject)",
    from: row.from ?? "",
    to: asStringArray(row.to),
    createdAt: toIso(row.created_at),
    lastEvent: null,
  };
}
