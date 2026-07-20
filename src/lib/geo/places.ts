import { Country, State } from "country-state-city";

export type CountryOption = { code: string; name: string };
export type StateOption = { code: string; name: string };

let countriesCache: CountryOption[] | null = null;
let countryNamesCache: string[] | null = null;

export function listCountries(): CountryOption[] {
  if (!countriesCache) {
    countriesCache = Country.getAllCountries()
      .map((c) => ({ code: c.isoCode, name: c.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  return countriesCache;
}

/** Official country display names (sorted), for multi-select pickers. */
export function listCountryNames(): string[] {
  if (!countryNamesCache) {
    countryNamesCache = listCountries().map((c) => c.name);
  }
  return countryNamesCache;
}

export function listStatesForCountry(countryCode: string): StateOption[] {
  if (!countryCode) return [];
  return State.getStatesOfCountry(countryCode)
    .map((s) => ({ code: s.isoCode, name: s.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function countryName(countryCode?: string | null): string {
  if (!countryCode) return "";
  return Country.getCountryByCode(countryCode)?.name ?? countryCode;
}

/**
 * Resolve free-text or ISO code to the official country-state-city name.
 * Returns null when the value is not a known country.
 */
export function resolveCountryName(raw?: string | null): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  const byCode = Country.getCountryByCode(trimmed.toUpperCase());
  if (byCode) return byCode.name;

  const lower = trimmed.toLowerCase();
  const exact = listCountries().find((c) => c.name.toLowerCase() === lower);
  return exact?.name ?? null;
}

/** Dedupe and map to official country names; drops unknown entries. */
export function normalizeCountryNames(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const name = resolveCountryName(value);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out;
}

export function stateName(
  countryCode?: string | null,
  stateCode?: string | null,
): string {
  if (!countryCode || !stateCode) return "";
  return (
    State.getStateByCodeAndCountry(stateCode, countryCode)?.name ?? stateCode
  );
}

/** "Remote · California, United States" style label for job cards/detail. */
export function formatJobPlaceLabel(opts: {
  location?: string | null;
  countryCode?: string | null;
  stateCode?: string | null;
  locationLabel?: string;
}): string {
  const parts: string[] = [];
  if (opts.locationLabel) parts.push(opts.locationLabel);
  const state = stateName(opts.countryCode, opts.stateCode);
  const country = countryName(opts.countryCode);
  const place = [state, country].filter(Boolean).join(", ");
  if (place) parts.push(place);
  return parts.join(" · ");
}
