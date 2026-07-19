import "server-only";

import { generateText, Output } from "ai";
import { z } from "zod";
import {
  deferredDocAnalysis,
  type KycAnalysis,
  type KycDeferableSlot,
  type KycDocAnalysis,
  type KycProfileMatchLevel,
} from "@/lib/kyc";

const gatewayModel = process.env.AI_GATEWAY_MODEL?.trim() || "openai/gpt-4o";

const matchLevel = z.enum(["match", "partial", "mismatch", "unknown"]);
const profileMatchLevel = z.enum([
  "match",
  "partial",
  "mismatch",
  "unknown",
  "not_provided",
]);

const docAnalysisSchema = z.object({
  documentPresent: z.boolean(),
  looksAuthentic: z.boolean(),
  likelyAiGeneratedOrTampered: z.boolean(),
  extractedName: z.string().max(200),
  extractedIdHint: z.string().max(80),
  notes: z.string().max(500),
});

const kycAnalysisSchema = z.object({
  aadhaarFront: docAnalysisSchema,
  aadhaarBack: docAnalysisSchema,
  pan: docAnalysisSchema,
  passport: docAnalysisSchema,
  nameConsistency: matchLevel,
  profileNameMatch: profileMatchLevel,
  profileDobMatch: profileMatchLevel,
  profileAddressMatch: profileMatchLevel,
  overallAuthentic: z.boolean(),
  summary: z.string().min(20).max(2000),
  concerns: z.array(z.string().min(1).max(300)).max(10),
});

export type KycDocBytes = {
  bytes: Uint8Array;
  mediaType: string;
};

/** Logged-in candidate fields used to bind KYC docs to that person. */
export type KycCandidateProfile = {
  name: string;
  dateOfBirth: string;
  residenceCity: string;
  residenceState: string;
  residenceCountry: string;
  residencePostalCode: string;
  location: string;
};

export type KycVerifyDocs = {
  aadhaarFront: KycDocBytes;
  aadhaarBack: KycDocBytes;
  pan?: KycDocBytes | null;
  passport?: KycDocBytes | null;
};

export type KycDeferredFlags = {
  pan: boolean;
  passport: boolean;
};

function asFilePart(
  bytes: Uint8Array,
  mediaType: string,
):
  | { type: "file"; data: Uint8Array; mediaType: string }
  | { type: "image"; image: Uint8Array; mediaType?: string } {
  if (mediaType === "application/pdf") {
    return { type: "file", data: bytes, mediaType: "application/pdf" };
  }
  if (mediaType.startsWith("image/")) {
    return { type: "image", image: bytes, mediaType };
  }
  return { type: "file", data: bytes, mediaType };
}

function profileBlock(profile: KycCandidateProfile): string {
  const addressParts = [
    profile.residenceCity,
    profile.residenceState,
    profile.residenceCountry,
    profile.residencePostalCode,
  ]
    .map((p) => p.trim())
    .filter(Boolean);
  const address =
    addressParts.join(", ") || profile.location.trim() || "(not on profile)";

  return `REGISTERED CANDIDATE PROFILE (must match the person on the documents):
- Full name: ${profile.name.trim() || "(missing — reject)"}
- Date of birth: ${profile.dateOfBirth.trim() || "(not on profile)"}
- Address / residence: ${address}`;
}

function isOkMatch(level: KycProfileMatchLevel): boolean {
  return level === "match" || level === "partial";
}

function placeholderSkipped(slot: "pan" | "passport"): KycDocAnalysis {
  return {
    documentPresent: false,
    looksAuthentic: true,
    likelyAiGeneratedOrTampered: false,
    extractedName: "",
    extractedIdHint: "",
    notes: `${slot === "pan" ? "PAN" : "Passport"} not included in this submission.`,
  };
}

/**
 * AI authenticity + identity binding check.
 * Aadhaar front+back are always required. PAN / Passport may be deferred.
 * No Blob upload happens here — callers upload only after a pass.
 */
export async function verifyKycDocumentBytes(
  docs: KycVerifyDocs,
  profile: KycCandidateProfile,
  deferred: KycDeferredFlags = { pan: false, passport: false },
): Promise<KycAnalysis> {
  const hasName = Boolean(profile.name.trim());
  const hasDob = Boolean(profile.dateOfBirth.trim());
  const hasAddress = Boolean(
    profile.residenceCity.trim() ||
      profile.residenceState.trim() ||
      profile.residenceCountry.trim() ||
      profile.residencePostalCode.trim() ||
      profile.location.trim(),
  );

  const panProvided = Boolean(docs.pan && !deferred.pan);
  const passportProvided = Boolean(docs.passport && !deferred.passport);

  const deferredList = [
    deferred.pan ? "PAN (deferred — submit later)" : null,
    deferred.passport ? "Passport (deferred — submit later)" : null,
  ]
    .filter(Boolean)
    .join("; ");

  const content: Array<
    | { type: "text"; text: string }
    | ReturnType<typeof asFilePart>
  > = [
    {
      type: "text",
      text: `You are an identity-document authenticity reviewer for Indian KYC.

${profileBlock(profile)}

Required documents in this submission:
1) Aadhaar card — FRONT side (photo + name side) — ALWAYS required
2) Aadhaar card — BACK side (address / QR side) — ALWAYS required
${panProvided ? "3) PAN card — included" : "3) PAN card — NOT included (deferred by candidate)"}
${passportProvided ? "4) Passport — included" : "4) Passport — NOT included (deferred by candidate)"}

${deferredList ? `Deferred documents: ${deferredList}. For deferred slots, set documentPresent=false, looksAuthentic=true, likelyAiGeneratedOrTampered=false, notes explaining deferred.` : "All four documents are included."}

CRITICAL — identity binding:
These documents MUST belong to the registered candidate above, not a parent, friend, or any other person.
- profileNameMatch: compare extracted names on the SUBMITTED docs to the profile full name (ignore case / minor spelling / middle-name order). Use mismatch if clearly a different person. Use not_provided only if the profile name is missing.
- profileDobMatch: compare DOB readable on submitted docs to the profile DOB. Use not_provided if the profile has no DOB. Use mismatch if dates clearly differ. Use unknown only if DOB is not readable on any submitted document.
- profileAddressMatch: compare address on Aadhaar back (and passport if present) to the profile residence/location. City/state/country agreement can be partial. Use not_provided if the profile has no address. Use mismatch if clearly a different place. Use unknown if address is not readable.

For EACH submitted file, decide:
- documentPresent: is this clearly the expected side/document type?
  - aadhaarFront must look like the front of an Aadhaar (photo + demographic side)
  - aadhaarBack must look like the back of an Aadhaar (address / QR side)
- looksAuthentic: real physical/scanned government ID
- likelyAiGeneratedOrTampered: true if AI-generated, heavily photoshopped, synthetic, or fake
- extractedName / extractedIdHint / notes as usual

nameConsistency: only across documents that were actually submitted (match / partial / mismatch / unknown).

Set overallAuthentic=true ONLY if ALL of these hold:
- Aadhaar front and back are present and look authentic
- every SUBMITTED document looks authentic and is not AI-generated/tampered
- Aadhaar front and back belong together as the same identity
- names are consistent across submitted documents (match or partial)
- profileNameMatch is match or partial
- if the profile has a DOB: profileDobMatch is match or partial
- if the profile has an address: profileAddressMatch is not mismatch

Deferred PAN/Passport must NOT cause overallAuthentic=false by themselves.
Be strict about AI fakes and identity mismatch. Prefer failed verification when unsure.`,
    },
    { type: "text", text: "Document — Aadhaar FRONT:" },
    asFilePart(docs.aadhaarFront.bytes, docs.aadhaarFront.mediaType),
    { type: "text", text: "Document — Aadhaar BACK:" },
    asFilePart(docs.aadhaarBack.bytes, docs.aadhaarBack.mediaType),
  ];

  if (panProvided && docs.pan) {
    content.push(
      { type: "text", text: "Document — PAN:" },
      asFilePart(docs.pan.bytes, docs.pan.mediaType),
    );
  }
  if (passportProvided && docs.passport) {
    content.push(
      { type: "text", text: "Document — Passport:" },
      asFilePart(docs.passport.bytes, docs.passport.mediaType),
    );
  }

  const { output } = await generateText({
    model: gatewayModel,
    output: Output.object({ schema: kycAnalysisSchema }),
    messages: [{ role: "user", content }],
  });

  if (!output) {
    throw new Error("KYC analysis returned no result");
  }

  const panAnalysis: KycDocAnalysis = deferred.pan
    ? deferredDocAnalysis("pan")
    : panProvided
      ? output.pan
      : placeholderSkipped("pan");
  const passportAnalysis: KycDocAnalysis = deferred.passport
    ? deferredDocAnalysis("passport")
    : passportProvided
      ? output.passport
      : placeholderSkipped("passport");

  const requiredChecks: KycDocAnalysis[] = [
    output.aadhaarFront,
    output.aadhaarBack,
  ];
  if (panProvided) requiredChecks.push(output.pan);
  if (passportProvided) requiredChecks.push(output.passport);

  const nameOk = hasName && isOkMatch(output.profileNameMatch);
  const dobOk = !hasDob || isOkMatch(output.profileDobMatch);
  const addressOk =
    !hasAddress ||
    (output.profileAddressMatch !== "mismatch" &&
      (isOkMatch(output.profileAddressMatch) ||
        output.profileAddressMatch === "unknown"));

  const concerns = [...output.concerns];
  if (!hasName) {
    concerns.unshift(
      "Your profile has no name — complete your profile before KYC.",
    );
  } else if (!isOkMatch(output.profileNameMatch)) {
    concerns.unshift(
      "Name on the documents does not match your registered profile name.",
    );
  }
  if (hasDob && !isOkMatch(output.profileDobMatch)) {
    concerns.unshift(
      "Date of birth on the documents does not match your profile.",
    );
  }
  if (hasAddress && output.profileAddressMatch === "mismatch") {
    concerns.unshift(
      "Address on the documents does not match your profile residence.",
    );
  }
  for (const slot of ["pan", "passport"] as KycDeferableSlot[]) {
    if (deferred[slot]) {
      concerns.push(
        `${slot === "pan" ? "PAN" : "Passport"} marked not available — submit later undertaking accepted.`,
      );
    }
  }

  // Aadhaar-only: match/partial/unknown OK. Extra docs: require match/partial.
  const nameConsistencyOk =
    output.nameConsistency === "match" ||
    output.nameConsistency === "partial" ||
    (!(panProvided || passportProvided) &&
      output.nameConsistency === "unknown");

  const hardened =
    requiredChecks.every((d) => d.documentPresent && d.looksAuthentic) &&
    requiredChecks.every((d) => !d.likelyAiGeneratedOrTampered) &&
    nameConsistencyOk &&
    nameOk &&
    dobOk &&
    addressOk &&
    output.overallAuthentic;

  return {
    aadhaarFront: output.aadhaarFront,
    aadhaarBack: output.aadhaarBack,
    pan: panAnalysis,
    passport: passportAnalysis,
    nameConsistency: output.nameConsistency,
    profileNameMatch: output.profileNameMatch,
    profileDobMatch: output.profileDobMatch,
    profileAddressMatch: output.profileAddressMatch,
    overallAuthentic: hardened,
    summary: output.summary,
    concerns: concerns.slice(0, 10),
    checkedAt: new Date(),
  };
}
