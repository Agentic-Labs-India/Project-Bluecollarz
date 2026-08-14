/**
 * Compliance package layout:
 *   arm.ts            — hire-facing assurance (client-safe types + scrub)
 *   analytics.ts      — cookie/GA consent (client-safe)
 *   consent.ts        — append-only consent ledger (server-only)
 *   rights.ts         — DPDP rights requests + access export (server-only)
 *   breach.ts         — breach incident workflow (server-only)
 *   grievance.ts      — GO contact from env (server-safe)
 *   placement-audit.ts — Model 2 stubs, flag-gated (server-only)
 *
 * Import server modules by path (`@/lib/compliance/consent`), not from this
 * barrel, so client bundles never pull `server-only`.
 */

export * from "./arm";
export * from "./analytics";
