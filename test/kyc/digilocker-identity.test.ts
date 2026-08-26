import { describe, expect, test } from "bun:test";
import {
  digilockerProfileSet,
  identityMismatches,
} from "@/lib/kyc/apply-digilocker";
import type { DigilockerKycPayload } from "@/lib/kyc/digilocker";
import {
  digilockerRedirectUri,
  openOAuthCookie,
  sealOAuthCookie,
} from "@/lib/kyc/digilocker";

function payload(
  overrides: Partial<DigilockerKycPayload> = {},
): DigilockerKycPayload {
  return {
    digilockerId: "dl-user-1",
    name: "Test Worker",
    dob: "1990-01-15",
    gender: "M",
    uidMasked: "XXXXXXXX1234",
    address: "Hyderabad",
    pan: "ABCDE1234F",
    phone: "9876543210",
    ...overrides,
  };
}

describe("DigiLocker candidate identity", () => {
  test("redirect URI follows the request host, not BETTER_AUTH_URL", () => {
    const headers = new Headers({
      "x-forwarded-proto": "https",
      "x-forwarded-host": "www.blucollarz.com",
    });
    expect(digilockerRedirectUri(headers, "http://localhost:3000")).toBe(
      "https://www.blucollarz.com/api/auth/digilocker/callback",
    );
  });

  test("login oauth cookie does not require a userId", () => {
    const sealed = sealOAuthCookie({
      state: "state",
      codeVerifier: "verifier",
      redirectUri: "http://localhost:3000/api/auth/digilocker/callback",
      intent: "login",
      returnTo: "/",
      createdAt: Date.now(),
    });
    const opened = openOAuthCookie(sealed);
    expect(opened?.intent).toBe("login");
    expect(opened?.userId).toBeUndefined();
  });

  test("reverify oauth cookie requires a userId", () => {
    const sealed = sealOAuthCookie({
      state: "state",
      codeVerifier: "verifier",
      redirectUri: "http://localhost:3000/api/auth/digilocker/callback",
      intent: "reverify",
      returnTo: "/candidate/kyc",
      createdAt: Date.now(),
    });
    expect(openOAuthCookie(sealed)).toBeNull();
  });

  test("identity mismatches if DigiLocker user id is missing", () => {
    const errors = identityMismatches({}, payload({ digilockerId: "" }));
    expect(errors.some((e) => /user id/i.test(e))).toBe(true);
  });

  test("profile set uses DigiLocker user id as the account key and never stores username or a DigiLocker email", () => {
    const { $set } = digilockerProfileSet(payload(), new Date("2026-08-26"));
    expect($set.digilockerId).toBe("dl-user-1");
    expect($set.email).toBe("dl-user-1");
    expect($set).not.toHaveProperty("username");
    expect($set).not.toHaveProperty("user_alias");
    expect($set.isKycVerified).toBe(true);
  });
});
