import { beforeEach, describe, expect, test } from "bun:test";
import {
  ADULT_ATTESTATION_KEY,
  hasAgreedAdultAttestation,
  readAdultAttestation,
  writeAdultAttestation,
} from "@/lib/compliance/age-gate";

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
  localStorage.removeItem(ADULT_ATTESTATION_KEY);
});

describe("adult attestation", () => {
  test("starts unset so the banner can show", () => {
    expect(readAdultAttestation()).toBeNull();
    expect(hasAgreedAdultAttestation()).toBe(false);
  });

  test("Agree is the only value that unlocks login", () => {
    writeAdultAttestation("declined");
    expect(hasAgreedAdultAttestation()).toBe(false);
    writeAdultAttestation("agreed");
    expect(hasAgreedAdultAttestation()).toBe(true);
  });
});
