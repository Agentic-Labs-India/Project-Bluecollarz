/** Client 18+ self-attestation (cookie banner). DigiLocker DOB remains the proof. */

export const ADULT_ATTESTATION_KEY = "blucollarz_adult_attestation_v1";
export const ADULT_GATE_SHOW_EVENT = "blucollarz:adult-gate-show";

export type AdultAttestation = "agreed" | "declined" | null;

export function readAdultAttestation(): AdultAttestation {
  try {
    const raw = localStorage.getItem(ADULT_ATTESTATION_KEY);
    if (raw === "agreed" || raw === "declined") return raw;
  } catch {
    /* ignore */
  }
  return null;
}

export function writeAdultAttestation(value: "agreed" | "declined") {
  try {
    localStorage.setItem(ADULT_ATTESTATION_KEY, value);
  } catch {
    /* ignore */
  }
}

export function hasAgreedAdultAttestation(): boolean {
  return readAdultAttestation() === "agreed";
}

/** Re-open the 18+ / cookie banner (login blocked until they Agree). */
export function requestAdultGate() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ADULT_GATE_SHOW_EVENT));
}
