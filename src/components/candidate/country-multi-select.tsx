"use client";

import * as React from "react";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import {
  listCountryNames,
  normalizeCountryNames,
} from "@/lib/geo/places";

const COUNTRY_NAMES = listCountryNames();

/** Multi-select preferred countries from country-state-city. */
export function CountryMultiSelect({
  value,
  onChange,
  placeholder = "Search and select countries…",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const anchor = useComboboxAnchor();
  const selected = React.useMemo(
    () => normalizeCountryNames(value),
    [value],
  );

  return (
    <Combobox
      multiple
      autoHighlight
      items={COUNTRY_NAMES}
      value={selected}
      onValueChange={(next) => {
        onChange(normalizeCountryNames(Array.isArray(next) ? next : []));
      }}
    >
      <ComboboxChips ref={anchor} className="w-full">
        <ComboboxValue>
          {(values: string[]) => (
            <React.Fragment>
              {values.map((name) => (
                <ComboboxChip key={name}>{name}</ComboboxChip>
              ))}
              <ComboboxChipsInput placeholder={placeholder} />
            </React.Fragment>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor} className="w-[var(--anchor-width)]">
        <ComboboxEmpty>No country found.</ComboboxEmpty>
        <ComboboxList>
          {(item) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
