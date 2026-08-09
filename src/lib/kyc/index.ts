/**
 * DigiLocker KYC on Users:
 *   isKycVerified: boolean
 *   kyc: { provider, verifiedAt, updatedAt, aadhaarLast4, pan, gender, apaarId }
 *
 * Raw DigiLocker XML/JSON is never stored.
 */

export type { KycProvider, UserKyc, KycFields } from "@/lib/kyc/types";

import type { KycFields } from "@/lib/kyc/types";

export interface KycPublicState {
  isKycVerified: boolean;
  provider: string | null;
  verifiedAt: string | null;
  updatedAt: string | null;
  gender: string | null;
  pan: string | null;
  aadhaarLast4: string | null;
  apaarId: string | null;
}

function asIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value) || null;
}

export function isIdentityVerified(
  doc: KycFields | null | undefined,
): boolean {
  return doc?.isKycVerified === true;
}

export function toKycPublicState(
  doc: KycFields | null | undefined,
): KycPublicState {
  const pack = doc?.kyc ?? null;
  return {
    isKycVerified: isIdentityVerified(doc),
    provider: pack?.provider ? String(pack.provider) : null,
    verifiedAt: asIso(pack?.verifiedAt),
    updatedAt: asIso(pack?.updatedAt),
    gender: pack?.gender ? String(pack.gender) : null,
    pan: pack?.pan ? String(pack.pan) : null,
    aadhaarLast4: pack?.aadhaarLast4 ? String(pack.aadhaarLast4) : null,
    apaarId: pack?.apaarId ? String(pack.apaarId) : null,
  };
}

export {
  digilockerProfileSet,
  compareIdentity,
} from "@/lib/kyc/apply-digilocker";
