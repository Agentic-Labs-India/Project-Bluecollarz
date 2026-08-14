export type KycProvider = "digilocker";

/** Nested identity pack on the Users document (`user.kyc`). */
export interface UserKyc {
  provider?: KycProvider | string;
  verifiedAt?: Date | string | null;
  updatedAt?: Date | string | null;
  /** Last 4 digits of Aadhaar only. */
  aadhaarLast4?: string | null;
  pan?: string | null;
  gender?: string | null;
  apaarId?: string | null;
  /**
   * Optional persisted Attribute Release Matrix conclusions.
   * Shape matches `AttributeAssuranceMap` in `@/lib/compliance/arm`.
   */
  attributes?: Record<
    string,
    {
      status: string;
      assuredAt?: string | null;
      source?: string | null;
    }
  >;
}

/** KYC fields on a Users document. */
export interface KycFields {
  isKycVerified?: boolean;
  kyc?: UserKyc | null;
}
