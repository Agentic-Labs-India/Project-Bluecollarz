import "server-only";
import type { DigilockerKycPayload } from "@/lib/digilocker";
import { parseDateOnly } from "@/lib/dates";
import type { UserKyc } from "@/lib/kyc/types";

function normName(value: string | null | undefined) {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** DigiLocker DOB → `yyyy-MM-dd`. */
export function digilockerDobToWire(dob: string | null): string | null {
  if (!dob?.trim()) return null;
  const raw = dob.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const slash = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (slash) {
    return `${slash[3]}-${slash[2].padStart(2, "0")}-${slash[1].padStart(2, "0")}`;
  }

  const compact = raw.replace(/\D/g, "");
  if (compact.length === 8) {
    return `${compact.slice(4, 8)}-${compact.slice(2, 4)}-${compact.slice(0, 2)}`;
  }
  return null;
}

export function aadhaarLast4FromMasked(uidMasked: string | null): string | null {
  if (!uidMasked) return null;
  const digits = uidMasked.replace(/\D/g, "");
  if (digits.length < 4) return null;
  return digits.slice(-4);
}

export function parseDigilockerPhone(phone: string | null): {
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

function normalizeGender(raw: string | null): string | null {
  if (!raw?.trim()) return null;
  const g = raw.trim().toUpperCase();
  if (g === "M" || g === "MALE") return "M";
  if (g === "F" || g === "FEMALE") return "F";
  if (g === "T" || g === "TRANSGENDER") return "T";
  return raw.trim();
}

export function compareIdentity(
  profile: {
    name?: string | null;
    location?: string | null;
    phoneNumber?: number | null;
    dateOfBirth?: Date | string | null;
    pan?: string | null;
  },
  dl: DigilockerKycPayload,
): string[] {
  const mismatches: string[] = [];
  const pName = normName(profile.name);
  const dName = normName(dl.name);
  if (pName && dName && pName !== dName) {
    mismatches.push(
      `Name differs (profile: "${profile.name}", DigiLocker: "${dl.name}"). Profile updated to DigiLocker name.`,
    );
  }

  const pLoc = (profile.location || "").trim().toLowerCase();
  const dLoc = (dl.address || "").trim().toLowerCase();
  if (
    pLoc &&
    dLoc &&
    pLoc !== dLoc &&
    !dLoc.includes(pLoc) &&
    !pLoc.includes(dLoc)
  ) {
    mismatches.push(
      "Location/address differs from DigiLocker; profile address updated from DigiLocker.",
    );
  }

  const { phoneNumber: dlPhone } = parseDigilockerPhone(dl.phone);
  if (
    profile.phoneNumber != null &&
    dlPhone != null &&
    Number(profile.phoneNumber) !== dlPhone
  ) {
    mismatches.push(
      "Phone differs from DigiLocker; profile phone updated from DigiLocker.",
    );
  }

  const dlDob = digilockerDobToWire(dl.dob);
  if (profile.dateOfBirth && dlDob) {
    const pDob =
      profile.dateOfBirth instanceof Date
        ? profile.dateOfBirth.toISOString().slice(0, 10)
        : String(profile.dateOfBirth).slice(0, 10);
    if (pDob && pDob !== dlDob) {
      mismatches.push(
        "Date of birth differs from DigiLocker; profile DOB updated from DigiLocker.",
      );
    }
  }

  const pPan = (profile.pan || "").trim().toUpperCase();
  const dPan = (dl.pan || "").trim().toUpperCase();
  if (pPan && dPan && pPan !== dPan) {
    mismatches.push(
      "PAN differs from DigiLocker; profile PAN updated from DigiLocker.",
    );
  }

  return mismatches;
}

/** Mongo update for DigiLocker verification → profile + nested `kyc`. */
export function digilockerProfileSet(
  dl: DigilockerKycPayload,
  verifiedAt: Date,
): { $set: Record<string, unknown>; $unset: Record<string, ""> } {
  const $set: Record<string, unknown> = {
    isKycVerified: true,
  };

  if (dl.name?.trim()) $set.name = dl.name.trim();

  const dobWire = digilockerDobToWire(dl.dob);
  const dob = dobWire ? parseDateOnly(dobWire) : null;
  if (dob) $set.dateOfBirth = dob;

  if (dl.address?.trim()) $set.location = dl.address.trim();

  const pin = dl.address?.match(/\b(\d{6})\b/)?.[1];
  if (pin) $set.residencePostalCode = pin;

  const { phoneNumber, phoneCountryCode } = parseDigilockerPhone(dl.phone);
  if (phoneNumber !== null) $set.phoneNumber = phoneNumber;
  if (phoneCountryCode !== null) $set.phoneCountryCode = phoneCountryCode;

  const kyc: Required<UserKyc> = {
    provider: "digilocker",
    verifiedAt,
    updatedAt: verifiedAt,
    aadhaarLast4: aadhaarLast4FromMasked(dl.uidMasked),
    pan: dl.pan?.trim() ? dl.pan.trim().toUpperCase() : null,
    gender: normalizeGender(dl.gender),
    apaarId: dl.apaarId?.trim() ? dl.apaarId.trim() : null,
  };
  $set.kyc = kyc;

  // Drop older flat KYC keys so the user doc only has the nested pack.
  const $unset: Record<string, ""> = {
    verified: "",
    kycStatus: "",
    kycProvider: "",
    kycVerifiedAt: "",
    kycUpdatedAt: "",
    kycDocuments: "",
    kycAnalysis: "",
    kycDeferred: "",
    aadhaarLast4: "",
    pan: "",
    gender: "",
    apaarId: "",
  };

  return { $set, $unset };
}
