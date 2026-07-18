import "server-only";

import { generateText, Output } from "ai";
import { z } from "zod";
import type { KycAnalysis } from "@/lib/kyc";

const gatewayModel = process.env.AI_GATEWAY_MODEL?.trim() || "openai/gpt-4o";

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
  nameConsistency: z.enum(["match", "partial", "mismatch", "unknown"]),
  overallAuthentic: z.boolean(),
  summary: z.string().min(20).max(2000),
  concerns: z.array(z.string().min(1).max(300)).max(8),
});

export type KycDocBytes = {
  bytes: Uint8Array;
  mediaType: string;
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

/**
 * AI authenticity check for Aadhaar (front+back) + PAN + Passport.
 * No Blob upload happens here — callers upload only after a pass.
 */
export async function verifyKycDocumentBytes(docs: {
  aadhaarFront: KycDocBytes;
  aadhaarBack: KycDocBytes;
  pan: KycDocBytes;
  passport: KycDocBytes;
}): Promise<KycAnalysis> {
  const { output } = await generateText({
    model: gatewayModel,
    output: Output.object({ schema: kycAnalysisSchema }),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `You are an identity-document authenticity reviewer for Indian KYC.

You will receive four files in order:
1) Aadhaar card — FRONT side (photo + name side)
2) Aadhaar card — BACK side (address / QR side)
3) PAN card
4) Passport (photo page / ID page)

For EACH file, decide:
- documentPresent: is this clearly the expected side/document type?
  - aadhaarFront must look like the front of an Aadhaar (photo + demographic side)
  - aadhaarBack must look like the back of an Aadhaar (address / QR side) — reject if it is another front, blank, or unrelated
- looksAuthentic: real physical/scanned government ID (not selfie, blank paper, or unrelated image)
- likelyAiGeneratedOrTampered: true if AI-generated, heavily photoshopped, synthetic, or fake
- extractedName: full name if readable, else ""
- extractedIdHint: partially masked id, never full secrets when avoidable
- notes: short, specific rejection/approval reason the candidate can act on

Then assess nameConsistency across Aadhaar (front/back), PAN, and Passport (match / partial / mismatch / unknown).

Set overallAuthentic=true ONLY if:
- all four files are present and look authentic for their expected type/side
- none are likely AI-generated or tampered
- Aadhaar front and back clearly belong together as the same card identity
- names are consistent (match or partial — not mismatch)

Be strict about AI fakes and digital forgeries. Prefer failed verification when unsure.
Return concrete concerns for anything suspicious.`,
          },
          { type: "text", text: "Document 1 — Aadhaar FRONT:" },
          asFilePart(docs.aadhaarFront.bytes, docs.aadhaarFront.mediaType),
          { type: "text", text: "Document 2 — Aadhaar BACK:" },
          asFilePart(docs.aadhaarBack.bytes, docs.aadhaarBack.mediaType),
          { type: "text", text: "Document 3 — PAN:" },
          asFilePart(docs.pan.bytes, docs.pan.mediaType),
          { type: "text", text: "Document 4 — Passport:" },
          asFilePart(docs.passport.bytes, docs.passport.mediaType),
        ],
      },
    ],
  });

  if (!output) {
    throw new Error("KYC analysis returned no result");
  }

  const checked = [
    output.aadhaarFront,
    output.aadhaarBack,
    output.pan,
    output.passport,
  ];
  const hardened =
    checked.every((d) => d.documentPresent && d.looksAuthentic) &&
    checked.every((d) => !d.likelyAiGeneratedOrTampered) &&
    (output.nameConsistency === "match" ||
      output.nameConsistency === "partial") &&
    output.overallAuthentic;

  return {
    aadhaarFront: output.aadhaarFront,
    aadhaarBack: output.aadhaarBack,
    pan: output.pan,
    passport: output.passport,
    nameConsistency: output.nameConsistency,
    overallAuthentic: hardened,
    summary: output.summary,
    concerns: output.concerns,
    checkedAt: new Date(),
  };
}
