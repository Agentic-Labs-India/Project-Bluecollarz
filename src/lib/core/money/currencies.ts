import * as currencyCodes from "currency-codes";

/** UAE Dirham — default for new roles. */
export const DEFAULT_CURRENCY = "AED";

export type CurrencyOption = {
  code: string;
  name: string;
  label: string;
};

let currenciesCache: CurrencyOption[] | null = null;

function toOption(isoCode: string): CurrencyOption | null {
  const record = currencyCodes.code(isoCode);
  if (!record) return null;
  return {
    code: record.code,
    name: record.currency,
    label: `${record.code} · ${record.currency}`,
  };
}

/** ISO 4217 list from `currency-codes`. AED is pinned first. */
export function listCurrencies(): CurrencyOption[] {
  if (!currenciesCache) {
    const options = currencyCodes
      .codes()
      .map((isoCode) => toOption(isoCode))
      .filter((item): item is CurrencyOption => item !== null)
      .sort((a, b) => a.code.localeCompare(b.code));
    currenciesCache = [
      ...options.filter((item) => item.code === DEFAULT_CURRENCY),
      ...options.filter((item) => item.code !== DEFAULT_CURRENCY),
    ];
  }
  return currenciesCache;
}

export function isCurrencyCode(raw?: string | null): boolean {
  const isoCode = (raw ?? "").trim().toUpperCase();
  return isoCode.length === 3 && Boolean(currencyCodes.code(isoCode));
}

export function currencyLabel(code: string): string {
  return toOption(code.trim().toUpperCase())?.label ?? code;
}
