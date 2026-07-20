"use client";

import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  countryCodeFromName,
  listCitiesForCountry,
  listCitiesForState,
  listCountries,
  listStatesForCountry,
  normalizeResidencePlace,
  stateCodeFromName,
} from "@/lib/geo/places";

type ResidenceValue = {
  country: string;
  state: string;
  city: string;
};

/** Cascading country → state → city pickers backed by country-state-city. */
export function ResidencePlaceFields({
  country,
  state,
  city,
  onChange,
}: {
  country: string;
  state: string;
  city: string;
  onChange: (next: ResidenceValue) => void;
}) {
  const normalized = useMemo(
    () => normalizeResidencePlace({ country, state, city }),
    [country, state, city],
  );

  const countries = useMemo(() => listCountries(), []);
  const countryCode = countryCodeFromName(normalized.country) ?? "";
  const states = useMemo(
    () => listStatesForCountry(countryCode),
    [countryCode],
  );
  const stateCode =
    countryCode && normalized.state
      ? stateCodeFromName(countryCode, normalized.state)
      : null;

  const cityNames = useMemo(() => {
    if (!countryCode) return [] as string[];
    if (states.length > 0) {
      if (!stateCode) return [];
      return listCitiesForState(countryCode, stateCode).map((c) => c.name);
    }
    return listCitiesForCountry(countryCode).map((c) => c.name);
  }, [countryCode, stateCode, states.length]);

  const needsState = states.length > 0;
  const cityEnabled =
    Boolean(countryCode) && (!needsState || Boolean(stateCode));

  const setPlace = (next: Partial<ResidenceValue>) => {
    const merged = {
      country: next.country ?? normalized.country,
      state: next.state ?? normalized.state,
      city: next.city ?? normalized.city,
    };
    onChange(normalizeResidencePlace(merged));
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label>Country</Label>
        <Select
          value={normalized.country || undefined}
          onValueChange={(value) =>
            setPlace({ country: value, state: "", city: "" })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select country" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {countries.map((c) => (
              <SelectItem key={c.code} value={c.name}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>State / Province / Region</Label>
        <Select
          value={normalized.state || undefined}
          onValueChange={(value) => setPlace({ state: value, city: "" })}
          disabled={!countryCode || !needsState}
        >
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={
                !countryCode
                  ? "Select a country first"
                  : !needsState
                    ? "No states for this country"
                    : "Select state"
              }
            />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {states.map((s) => (
              <SelectItem key={s.code} value={s.name}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label>City</Label>
        <Combobox
          items={cityNames}
          value={normalized.city || null}
          onValueChange={(value) =>
            setPlace({ city: typeof value === "string" ? value : "" })
          }
          disabled={!cityEnabled || cityNames.length === 0}
        >
          <ComboboxInput
            className="w-full"
            placeholder={
              !countryCode
                ? "Select a country first"
                : needsState && !stateCode
                  ? "Select a state first"
                  : cityNames.length === 0
                    ? "No cities listed"
                    : "Search and select city…"
            }
            disabled={!cityEnabled || cityNames.length === 0}
            showClear={Boolean(normalized.city)}
          />
          <ComboboxContent className="w-[var(--anchor-width)]">
            <ComboboxEmpty>No city found.</ComboboxEmpty>
            <ComboboxList>
              {(item) => (
                <ComboboxItem key={item} value={item}>
                  {item}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>
    </div>
  );
}
