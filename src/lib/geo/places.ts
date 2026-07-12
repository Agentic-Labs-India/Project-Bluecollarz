import { Country, State } from "country-state-city";

export type CountryOption = { code: string; name: string };
export type StateOption = { code: string; name: string };

let countriesCache: CountryOption[] | null = null;

export function listCountries(): CountryOption[] {
  if (!countriesCache) {
    countriesCache = Country.getAllCountries()
      .map((c) => ({ code: c.isoCode, name: c.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  return countriesCache;
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
