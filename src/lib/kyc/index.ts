/** Individual upload slots (Aadhaar requires front + back). */
export const KYC_UPLOAD_SLOTS = [
  "aadhaarFront",
  "aadhaarBack",
  "pan",
  "passport",
] as const;
export type KycUploadSlot = (typeof KYC_UPLOAD_SLOTS)[number];

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

export interface KycAnalysis {
  aadhaarFront: KycDocAnalysis;
  aadhaarBack: KycDocAnalysis;
  pan: KycDocAnalysis;
  passport: KycDocAnalysis;
  nameConsistency: "match" | "partial" | "mismatch" | "unknown";
  overallAuthentic: boolean;
  summary: string;
  concerns: string[];
  checkedAt: Date;
}

/** Stored on the Users document. */
export interface KycFields {
  kycStatus?: KycStatus;
  kycDocuments?: Partial<Record<KycUploadSlot, KycDocumentFile>>;
  kycAnalysis?: KycAnalysis;
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
  analysis: null | {
    aadhaarFront: KycDocAnalysis;
    aadhaarBack: KycDocAnalysis;
    pan: KycDocAnalysis;
    passport: KycDocAnalysis;
    nameConsistency: KycAnalysis["nameConsistency"];
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
