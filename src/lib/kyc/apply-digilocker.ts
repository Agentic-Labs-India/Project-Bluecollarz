import "server-only";
import {
  formatDateOnly,
  isAtLeast18YearsOld,
  parseDateOnly,
} from "@/lib/core/dates";
import type { DigilockerKycPayload } from "@/lib/kyc/digilocker";
import type { UserKyc } from "@/lib/kyc/types";

function digilockerDobToWire(dob: string | null): string | null {
  if (!dob?.trim()) return null;
  const raw = dob.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const slash = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (slash) {
    return `${slash[3]}-${slash[2].padStart(2, "0")}-${slash[1].padStart(2, "0")}`;
  }

  const compact = raw.replace(/\D/g, "");
  if (compact.length === 8) {
    return `${compact.slice(4, 8)}-${compact.slice(2, 4)}-${compact.slice(0, 2)}`;
  }
  return null;
}

function aadhaarLast4FromMasked(uidMasked: string | null): string | null {
  if (!uidMasked) return null;
  const digits = uidMasked.replace(/\D/g, "");
  if (digits.length < 4) return null;
  return digits.slice(-4);
}

function parseDigilockerPhone(phone: string | null): {
  phoneNumber: number | null;
  phoneCountryCode: number | null;
} {
  if (!phone) return { phoneNumber: null, phoneCountryCode: null };
  const digits = phone.replace(/\D/g, "");
  if (!digits) return { phoneNumber: null, phoneCountryCode: null };

  if (digits.length === 10) {
    return { phoneNumber: Number(digits), phoneCountryCode: 91 };
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return {
      phoneNumber: Number(digits.slice(2)),
      phoneCountryCode: 91,
    };
  }
  if (digits.length > 10) {
    return {
      phoneNumber: Number(digits.slice(-10)),
      phoneCountryCode: Number(digits.slice(0, digits.length - 10)) || 91,
    };
  }
  return { phoneNumber: Number(digits), phoneCountryCode: 91 };
}

function normalizeGender(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const g = raw.trim().toUpperCase();
  if (g === "M" || g === "MALE") return "M";
  if (g === "F" || g === "FEMALE") return "F";
  if (g === "T" || g === "TRANSGENDER") return "T";
  return raw.trim().toUpperCase();
}

type IdentityProfile = {
  phoneNumber?: number | null;
  dateOfBirth?: Date | null;
  pan?: string | null;
  aadhaarLast4?: string | null;
  gender?: string | null;
};

/**
 * DigiLocker is the identity source.
 * If a field is already on the profile (re-verify), it must match.
 */
export function identityMismatches(
  profile: IdentityProfile,
  dl: DigilockerKycPayload,
): string[] {
  const errors: string[] = [];

  if (!dl.digilockerId) errors.push("DigiLocker did not return a user id.");
  if (!dl.name?.trim()) errors.push("DigiLocker did not return a name.");

  const pDob = formatDateOnly(profile.dateOfBirth);
  const dDob = digilockerDobToWire(dl.dob);
  if (!dDob) errors.push("DigiLocker did not return a date of birth.");
  else if (pDob && pDob !== dDob) {
    errors.push(
      "Date of birth on DigiLocker does not match your profile. KYC must be done by the same person.",
    );
  }

  const { phoneNumber: dlPhone } = parseDigilockerPhone(dl.phone);
  if (
    profile.phoneNumber != null &&
    dlPhone != null &&
    profile.phoneNumber !== dlPhone
  ) {
    errors.push("Phone on DigiLocker does not match your profile.");
  }

  const pPan = (profile.pan || "").trim().toUpperCase();
  const dPan = (dl.pan || "").trim().toUpperCase();
  if (pPan && dPan && pPan !== dPan) {
    errors.push("PAN on DigiLocker does not match your profile.");
  }

  const dAadhaar = aadhaarLast4FromMasked(dl.uidMasked);
  const pAadhaar = (profile.aadhaarLast4 || "").replace(/\D/g, "").slice(-4);
  if (pAadhaar.length === 4 && dAadhaar && pAadhaar !== dAadhaar) {
    errors.push("Aadhaar on DigiLocker does not match your profile.");
  }

  const pGender = normalizeGender(profile.gender);
  const dGender = normalizeGender(dl.gender);
  if (pGender && dGender && pGender !== dGender) {
    errors.push("Gender on DigiLocker does not match your profile.");
  }

  return errors;
}

/** Mongo update after identity has already matched. */
export function digilockerProfileSet(
  dl: DigilockerKycPayload,
  verifiedAt: Date,
): { $set: Record<string, unknown> } {
  if (!dl.digilockerId) {
    throw new Error("DigiLocker did not return a user id.");
  }
  const dobWire = digilockerDobToWire(dl.dob);
  const dob = dobWire ? parseDateOnly(dobWire) : null;
  if (!dob) {
    throw new Error("DigiLocker did not return a date of birth.");
  }
  if (!isAtLeast18YearsOld(dob)) {
    throw new Error(
      "You must be at least 18 years old to complete DigiLocker verification on Blucollarz",
    );
  }

  const { phoneNumber, phoneCountryCode } = parseDigilockerPhone(dl.phone);
  const aadhaarLast4 = aadhaarLast4FromMasked(dl.uidMasked);
  const pan = dl.pan?.trim() ? dl.pan.trim().toUpperCase() : null;

  const kyc: UserKyc = {
    provider: "digilocker",
    verifiedAt,
    updatedAt: verifiedAt,
    aadhaarLast4,
    pan,
    gender: normalizeGender(dl.gender),
  };

  const $set: Record<string, unknown> = {
    isKycVerified: true,
    dateOfBirth: dob,
    kyc,
  };

  if (dl.name?.trim()) $set.name = dl.name.trim();
  if (phoneNumber !== null) $set.phoneNumber = phoneNumber;
  if (phoneCountryCode !== null) $set.phoneCountryCode = phoneCountryCode;
  if (dl.address?.trim()) $set.location = dl.address.trim();
  $set.digilockerId = dl.digilockerId;
  // Better Auth unique key — DigiLocker user id, not a DigiLocker email.
  $set.email = dl.digilockerId;

  return { $set };
}
