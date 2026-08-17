"use client";

import { useMemo } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listCitiesForCountry,
  listCitiesForState,
  listCountries,
  listStatesForCountry,
} from "@/lib/core/geo/places";

export function CountryCodeSelect({
  label = "Country",
  value,
  onChange,
  disabled,
  placeholder = "Select country",
}: {
  label?: string;
  value: string | null;
  onChange: (countryCode: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const countries = useMemo(() => listCountries(), []);
  return (
    <div className="min-w-0 space-y-1.5">
      <Label className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
        {label}
      </Label>
      <Select
        value={value ?? undefined}
        disabled={disabled}
        onValueChange={(next) => onChange(next || null)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {countries.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Country (ISO-2) → state code → city name from country-state-city. */
export function CountryStateCityFields({
  countryCode,
  stateCode,
  city,
  onChange,
  disabled,
  lockCountry,
}: {
  countryCode: string | null;
  stateCode: string | null;
  city: string;
  onChange: (next: {
    countryCode: string | null;
    stateCode: string | null;
    city: string;
  }) => void;
  disabled?: boolean;
  lockCountry?: boolean;
}) {
  const states = useMemo(
    () => listStatesForCountry(countryCode ?? ""),
    [countryCode],
  );
  const needsState = states.length > 0;
  const cityNames = useMemo(() => {
    if (!countryCode) return [] as string[];
    if (needsState) {
      if (!stateCode) return [];
      return listCitiesForState(countryCode, stateCode).map((c) => c.name);
    }
    return listCitiesForCountry(countryCode).map((c) => c.name);
  }, [countryCode, stateCode, needsState]);

  const cityEnabled =
    Boolean(countryCode) && (!needsState || Boolean(stateCode));

  return (
    <div className="grid gap-3 sm:grid-cols-2 sm:col-span-2">
      <CountryCodeSelect
        value={countryCode}
        disabled={disabled || lockCountry}
        onChange={(next) =>
          onChange({ countryCode: next, stateCode: null, city: "" })
        }
      />
      <div className="min-w-0 space-y-1.5">
        <Label className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
          State / province
        </Label>
        <Select
          value={stateCode ?? undefined}
          disabled={disabled || !countryCode || !needsState}
          onValueChange={(next) =>
            onChange({ countryCode, stateCode: next || null, city: "" })
          }
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
              <SelectItem key={s.code} value={s.code}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-0 space-y-1.5 sm:col-span-2">
        <Label className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
          City
        </Label>
        {!cityEnabled ? (
          <Input
            disabled
            value=""
            placeholder={
              !countryCode ? "Select a country first" : "Select a state first"
            }
          />
        ) : cityNames.length === 0 ? (
          <Input
            disabled={disabled}
            value={city}
            placeholder="Enter city"
            onChange={(event) =>
              onChange({
                countryCode,
                stateCode,
                city: event.target.value,
              })
            }
          />
        ) : (
          <Combobox
            items={cityNames}
            value={city || null}
            onValueChange={(value) =>
              onChange({
                countryCode,
                stateCode,
                city: typeof value === "string" ? value : "",
              })
            }
            disabled={disabled}
            autoHighlight
          >
            <ComboboxInput
              className="w-full"
              placeholder="Search and select city…"
              disabled={disabled}
              showClear={Boolean(city)}
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
        )}
      </div>
    </div>
  );
}
