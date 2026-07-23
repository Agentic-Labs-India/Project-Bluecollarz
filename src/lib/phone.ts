import { Country } from "country-state-city";

/** Dial-code options for the phone country picker (ISO → numeric dial). */

type DialCodeOption = {
  isoCode: string;
  name: string;
  flag: string;
  /** Calling code as a number (e.g. 91) */
  dialCode: number;
};

const PRIORITY_ISO = [
  "IN",
  "AE",
  "SA",
  "QA",
  "KW",
  "BH",
  "OM",
  "US",
  "GB",
  "PH",
  "NP",
  "BD",
  "PK",
  "EG",
  "JO",
];

let dialCodesCache: DialCodeOption[] | null = null;

function dialDigits(raw: string): number | null {
  const digits = raw
    .trim()
    .replace(/^\+/, "")
    .split(/[-/\s]/)[0]
    .replace(/\D/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

export function listDialCodes(): DialCodeOption[] {
  if (dialCodesCache) return dialCodesCache;

  const byIso = new Map<string, DialCodeOption>();
  for (const c of Country.getAllCountries()) {
    const dialCode = dialDigits(c.phonecode ?? "");
    if (dialCode === null) continue;
    byIso.set(c.isoCode, {
      isoCode: c.isoCode,
      name: c.name,
      flag: c.flag,
      dialCode,
    });
  }

  const priority = new Set(PRIORITY_ISO);
  dialCodesCache = [...byIso.values()].sort((a, b) => {
    const ap = priority.has(a.isoCode) ? PRIORITY_ISO.indexOf(a.isoCode) : 999;
    const bp = priority.has(b.isoCode) ? PRIORITY_ISO.indexOf(b.isoCode) : 999;
    if (ap !== bp) return ap - bp;
    return a.name.localeCompare(b.name);
  });
  return dialCodesCache;
}

export function dialCodeForIso(isoCode?: string | null): DialCodeOption | null {
  if (!isoCode) return null;
  return listDialCodes().find((c) => c.isoCode === isoCode) ?? null;
}

export function isoForDialCode(
  dialCode: number | null | undefined,
  fallbackIso = "IN",
): string {
  if (dialCode === null || dialCode === undefined) {
    return dialCodeForIso(fallbackIso)?.isoCode ?? "IN";
  }
  const match = listDialCodes().find((c) => c.dialCode === dialCode);
  if (match) {
    const preferred = listDialCodes().find(
      (c) => c.dialCode === dialCode && c.isoCode === fallbackIso,
    );
    return preferred?.isoCode ?? match.isoCode;
  }
  return dialCodeForIso(fallbackIso)?.isoCode ?? "IN";
}
