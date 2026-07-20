import { City, Country, State } from "country-state-city";

export type CountryOption = { code: string; name: string };
export type StateOption = { code: string; name: string };
export type CityOption = { name: string };

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

export function listCitiesForState(
  countryCode: string,
  stateCode: string,
): CityOption[] {
  if (!countryCode || !stateCode) return [];
  const seen = new Set<string>();
  const out: CityOption[] = [];
  for (const city of City.getCitiesOfState(countryCode, stateCode)) {
    const name = city.name?.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push({ name });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export function listCitiesForCountry(countryCode: string): CityOption[] {
  if (!countryCode) return [];
  const seen = new Set<string>();
  const out: CityOption[] = [];
  for (const city of City.getCitiesOfCountry(countryCode) ?? []) {
    const name = city.name?.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push({ name });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export function countryName(countryCode?: string | null): string {
  if (!countryCode) return "";
  return Country.getCountryByCode(countryCode)?.name ?? countryCode;
}

export function countryCodeFromName(name?: string | null): string | null {
  const resolved = resolveCountryName(name);
  if (!resolved) return null;
  return (
    listCountries().find((c) => c.name === resolved)?.code ??
    Country.getCountryByCode(name?.trim().toUpperCase() ?? "")?.isoCode ??
    null
  );
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

export function resolveStateName(
  countryCode: string,
  raw?: string | null,
): string | null {
  const trimmed = raw?.trim();
  if (!countryCode || !trimmed) return null;

  const byCode = State.getStateByCodeAndCountry(trimmed, countryCode);
  if (byCode) return byCode.name;

  const lower = trimmed.toLowerCase();
  const exact = listStatesForCountry(countryCode).find(
    (s) => s.name.toLowerCase() === lower,
  );
  return exact?.name ?? null;
}

export function stateCodeFromName(
  countryCode: string,
  stateNameRaw?: string | null,
): string | null {
  const name = resolveStateName(countryCode, stateNameRaw);
  if (!name) {
    const trimmed = stateNameRaw?.trim();
    if (trimmed && State.getStateByCodeAndCountry(trimmed, countryCode)) {
      return trimmed;
    }
    return null;
  }
  return (
    listStatesForCountry(countryCode).find((s) => s.name === name)?.code ?? null
  );
}

export function resolveCityName(
  countryCode: string,
  stateCode: string | null,
  raw?: string | null,
): string | null {
  const trimmed = raw?.trim();
  if (!countryCode || !trimmed) return null;
  const lower = trimmed.toLowerCase();

  const cities = stateCode
    ? listCitiesForState(countryCode, stateCode)
    : listCitiesForCountry(countryCode);

  return cities.find((c) => c.name.toLowerCase() === lower)?.name ?? null;
}

/** Normalize residence fields to official country-state-city names. */
export function normalizeResidencePlace(place: {
  country?: string | null;
  state?: string | null;
  city?: string | null;
}): { country: string; state: string; city: string } {
  const country = resolveCountryName(place.country) ?? "";
  const countryCode = country ? countryCodeFromName(country) : null;
  if (!countryCode) {
    return { country: "", state: "", city: "" };
  }

  const states = listStatesForCountry(countryCode);
  let state = "";
  let stateCode: string | null = null;
  if (states.length > 0) {
    state = resolveStateName(countryCode, place.state) ?? "";
    stateCode = state ? stateCodeFromName(countryCode, state) : null;
  }

  const city =
    resolveCityName(
      countryCode,
      states.length > 0 ? stateCode : null,
      place.city,
    ) ?? "";

  return { country, state, city };
}

/**
 * Tool-friendly place lookup for onboarding / agents.
 * - no country → list countries
 * - country only → list states (or cities if the country has no states)
 * - country + state → list cities (optional query filter)
 */
export function lookupPlaceOptions(opts: {
  country?: string | null;
  state?: string | null;
  query?: string | null;
}): {
  countries?: string[];
  country?: string;
  states?: string[];
  cities?: string[];
  error?: string;
} {
  const query = opts.query?.trim().toLowerCase() ?? "";
  const filter = (names: string[]) =>
    query ? names.filter((n) => n.toLowerCase().includes(query)) : names;

  if (!opts.country?.trim()) {
    return { countries: filter(listCountryNames()) };
  }

  const country = resolveCountryName(opts.country);
  const countryCode = country ? countryCodeFromName(country) : null;
  if (!country || !countryCode) {
    return {
      error:
        "Unknown country. Call again without country to list valid country names.",
    };
  }

  const states = listStatesForCountry(countryCode);
  if (!opts.state?.trim()) {
    if (states.length === 0) {
      return {
        country,
        states: [],
        cities: filter(listCitiesForCountry(countryCode).map((c) => c.name)),
      };
    }
    return {
      country,
      states: filter(states.map((s) => s.name)),
    };
  }

  const state = resolveStateName(countryCode, opts.state);
  const stateCode = state ? stateCodeFromName(countryCode, state) : null;
  if (!state || !stateCode) {
    return {
      country,
      error:
        "Unknown state for that country. Call with country only to list valid states.",
    };
  }

  return {
    country,
    states: [state],
    cities: filter(listCitiesForState(countryCode, stateCode).map((c) => c.name)),
  };
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
