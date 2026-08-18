import { beforeEach, describe, expect, test } from "bun:test";
import {
  SITE_AGREEMENT_KEY,
  hasAgreedToSite,
  readSiteAgreement,
  writeSiteAgreement,
} from "@/lib/compliance/site-agreement";

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    },
  });
  localStorage.removeItem(SITE_AGREEMENT_KEY);
});

describe("site agreement", () => {
  test("starts unset so the banner can show", () => {
    expect(readSiteAgreement()).toBeNull();
    expect(hasAgreedToSite()).toBe(false);
  });

  test("I agree is the only value that unlocks login", () => {
    writeSiteAgreement("declined");
    expect(hasAgreedToSite()).toBe(false);
    writeSiteAgreement("agreed");
    expect(hasAgreedToSite()).toBe(true);
  });
});
