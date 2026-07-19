/** Individual upload slots (Aadhaar requires front + back). */
export const KYC_UPLOAD_SLOTS = [
  "aadhaarFront",
  "aadhaarBack",
  "pan",
  "passport",
] as const;
export type KycUploadSlot = (typeof KYC_UPLOAD_SLOTS)[number];

/** Slots that may be deferred with a submit-later undertaking. */
export const KYC_DEFERABLE_SLOTS = ["pan", "passport"] as const;
export type KycDeferableSlot = (typeof KYC_DEFERABLE_SLOTS)[number];

/** High-level document groups shown in the UI. */
export const KYC_DOC_GROUPS = ["aadhaar", "pan", "passport"] as const;
export type KycDocGroup = (typeof KYC_DOC_GROUPS)[number];

export const KYC_STATUSES = [
  "not_started",
  "pending",
  "verified",
  "failed",
] as const;
export type KycStatus = (typeof KYC_STATUSES)[number];

export const KYC_UPLOAD_LABELS: Record<KycUploadSlot, string> = {
  aadhaarFront: "Aadhaar — front",
  aadhaarBack: "Aadhaar — back",
  pan: "PAN card",
  passport: "Passport",
};

export const KYC_DOC_GROUP_LABELS: Record<KycDocGroup, string> = {
  aadhaar: "Aadhaar card",
  pan: "PAN card",
  passport: "Passport",
};

export const KYC_UNDERTAKING_TEXT =
  "I confirm that PAN and/or Passport marked as not available are not submitted now. I undertake to upload the missing document(s) later when available, and I understand verification of those documents remains pending until then.";

export interface KycDocumentFile {
  url: string;
  pathname: string;
  contentType: string;
  uploadedAt: Date;
}

export interface KycDocAnalysis {
  documentPresent: boolean;
  looksAuthentic: boolean;
  likelyAiGeneratedOrTampered: boolean;
  extractedName: string;
  extractedIdHint: string;
  notes: string;
}

export type KycMatchLevel = "match" | "partial" | "mismatch" | "unknown";

/** Profile field match vs docs — `not_provided` when the profile has no value to compare. */
export type KycProfileMatchLevel = KycMatchLevel | "not_provided";

export interface KycAnalysis {
  aadhaarFront: KycDocAnalysis;
  aadhaarBack: KycDocAnalysis;
  pan: KycDocAnalysis;
  passport: KycDocAnalysis;
  /** Names agree across the documents that were submitted. */
  nameConsistency: KycMatchLevel;
  /** Document name(s) vs logged-in candidate profile name. */
  profileNameMatch: KycProfileMatchLevel;
  /** Document DOB vs candidate profile DOB (when profile has DOB). */
  profileDobMatch: KycProfileMatchLevel;
  /** Document address (usually Aadhaar back) vs candidate residence fields. */
  profileAddressMatch: KycProfileMatchLevel;
  overallAuthentic: boolean;
  summary: string;
  concerns: string[];
  checkedAt: Date;
}

/** PAN / Passport deferred with submit-later undertaking. */
export interface KycDeferredState {
  pan?: boolean;
  passport?: boolean;
  undertakingAcceptedAt?: Date;
}

/** Stored on the Users document. */
export interface KycFields {
  kycStatus?: KycStatus;
  kycDocuments?: Partial<Record<KycUploadSlot, KycDocumentFile>>;
  kycAnalysis?: KycAnalysis;
  kycDeferred?: KycDeferredState;
  kycVerifiedAt?: Date;
  kycUpdatedAt?: Date;
}

export interface KycPublicState {
  status: KycStatus;
  verified: boolean;
  documents: Partial<
    Record<
      KycUploadSlot,
      {
        url: string;
        pathname: string;
        contentType: string;
        uploadedAt: string;
      }
    >
  >;
  deferred: {
    pan: boolean;
    passport: boolean;
    undertakingAcceptedAt: string | null;
  };
  analysis: null | {
    aadhaarFront: KycDocAnalysis;
    aadhaarBack: KycDocAnalysis;
    pan: KycDocAnalysis;
    passport: KycDocAnalysis;
    nameConsistency: KycAnalysis["nameConsistency"];
    profileNameMatch: KycAnalysis["profileNameMatch"];
    profileDobMatch: KycAnalysis["profileDobMatch"];
    profileAddressMatch: KycAnalysis["profileAddressMatch"];
    overallAuthentic: boolean;
    summary: string;
    concerns: string[];
    checkedAt: string;
  };
  verifiedAt: string | null;
  updatedAt: string | null;
}

const emptyDocAnalysis = (): KycDocAnalysis => ({
  documentPresent: false,
  looksAuthentic: false,
  likelyAiGeneratedOrTampered: true,
  extractedName: "",
  extractedIdHint: "",
  notes: "Not checked",
});

export function deferredDocAnalysis(slot: KycDeferableSlot): KycDocAnalysis {
  return {
    documentPresent: false,
    looksAuthentic: true,
    likelyAiGeneratedOrTampered: false,
    extractedName: "",
    extractedIdHint: "",
    notes: `${KYC_UPLOAD_LABELS[slot]} not available — candidate undertook to submit later.`,
  };
}

export function toKycPublicState(doc: KycFields | null | undefined): KycPublicState {
  const status = doc?.kycStatus ?? "not_started";
  const documents: KycPublicState["documents"] = {};
  for (const slot of KYC_UPLOAD_SLOTS) {
    const file = doc?.kycDocuments?.[slot];
    if (file?.url) {
      documents[slot] = {
        url: file.url,
        pathname: file.pathname || "",
        contentType: file.contentType,
        uploadedAt:
          file.uploadedAt instanceof Date
            ? file.uploadedAt.toISOString()
            : String(file.uploadedAt ?? ""),
      };
    }
  }

  const analysis = doc?.kycAnalysis
    ? {
        aadhaarFront: doc.kycAnalysis.aadhaarFront ?? emptyDocAnalysis(),
        aadhaarBack: doc.kycAnalysis.aadhaarBack ?? emptyDocAnalysis(),
        pan: doc.kycAnalysis.pan ?? emptyDocAnalysis(),
        passport: doc.kycAnalysis.passport ?? emptyDocAnalysis(),
        nameConsistency: doc.kycAnalysis.nameConsistency ?? "unknown",
        profileNameMatch: doc.kycAnalysis.profileNameMatch ?? "unknown",
        profileDobMatch: doc.kycAnalysis.profileDobMatch ?? "unknown",
        profileAddressMatch: doc.kycAnalysis.profileAddressMatch ?? "unknown",
        overallAuthentic: Boolean(doc.kycAnalysis.overallAuthentic),
        summary: doc.kycAnalysis.summary ?? "",
        concerns: doc.kycAnalysis.concerns ?? [],
        checkedAt:
          doc.kycAnalysis.checkedAt instanceof Date
            ? doc.kycAnalysis.checkedAt.toISOString()
            : String(doc.kycAnalysis.checkedAt ?? ""),
      }
    : null;

  return {
    status,
    verified: status === "verified",
    documents,
    deferred: {
      pan: Boolean(doc?.kycDeferred?.pan),
      passport: Boolean(doc?.kycDeferred?.passport),
      undertakingAcceptedAt: doc?.kycDeferred?.undertakingAcceptedAt
        ? doc.kycDeferred.undertakingAcceptedAt instanceof Date
          ? doc.kycDeferred.undertakingAcceptedAt.toISOString()
          : String(doc.kycDeferred.undertakingAcceptedAt)
        : null,
    },
    analysis,
    verifiedAt: doc?.kycVerifiedAt
      ? doc.kycVerifiedAt instanceof Date
        ? doc.kycVerifiedAt.toISOString()
        : String(doc.kycVerifiedAt)
      : null,
    updatedAt: doc?.kycUpdatedAt
      ? doc.kycUpdatedAt instanceof Date
        ? doc.kycUpdatedAt.toISOString()
        : String(doc.kycUpdatedAt)
      : null,
  };
}

export function kycBlobUrls(doc: KycFields | null | undefined): string[] {
  const urls: string[] = [];
  for (const slot of KYC_UPLOAD_SLOTS) {
    const url = doc?.kycDocuments?.[slot]?.url;
    if (typeof url === "string") urls.push(url);
  }
  // Legacy single-aadhaar key from earlier KYC shape.
  const legacy = (doc?.kycDocuments as { aadhaar?: { url?: string } } | undefined)
    ?.aadhaar?.url;
  if (typeof legacy === "string") urls.push(legacy);
  return urls;
}
