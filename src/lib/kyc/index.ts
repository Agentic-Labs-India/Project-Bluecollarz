/**
 * DigiLocker KYC on Users:
 *   isKycVerified: boolean
 *   kyc: { provider, verifiedAt, updatedAt, aadhaarLast4, pan, gender }
 *
 * Identity only (name, DOB, phone, location, PAN, Aadhaar last 4, gender).
 * Email stays from Google. Raw DigiLocker XML/JSON is never stored.
 */

export type { KycFields, UserKyc } from "@/lib/kyc/types";

import type { KycFields } from "@/lib/kyc/types";

export interface KycPublicState {
  isKycVerified: boolean;
  provider: string | null;
  verifiedAt: string | null;
  updatedAt: string | null;
  gender: string | null;
  pan: string | null;
  aadhaarLast4: string | null;
}

function asIso(value: Date | null | undefined): string | null {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;
  return value.toISOString();
}

export function isIdentityVerified(doc: KycFields | null | undefined): boolean {
  return doc?.isKycVerified === true;
}

export function toKycPublicState(
  doc: KycFields | null | undefined,
): KycPublicState {
  const pack = doc?.kyc ?? null;
  return {
    isKycVerified: isIdentityVerified(doc),
    provider: pack?.provider ?? null,
    verifiedAt: asIso(pack?.verifiedAt),
    updatedAt: asIso(pack?.updatedAt),
    gender: pack?.gender ?? null,
    pan: pack?.pan ?? null,
    aadhaarLast4: pack?.aadhaarLast4 ?? null,
  };
}

export {
  digilockerProfileSet,
  identityMismatches,
} from "@/lib/kyc/apply-digilocker";
