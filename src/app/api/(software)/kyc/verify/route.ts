import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import client, { DB_NAME, COLLECTIONS, matchId } from "@/lib/db";
import { ensureIndexes } from "@/lib/db/indexes";
import { requireProfile } from "@/lib/api/session";
import { blobPathname } from "@/lib/blob/pathname";
import {
  KYC_UPLOAD_LABELS,
  KYC_UPLOAD_SLOTS,
  toKycPublicState,
  type KycDocumentFile,
  type KycFields,
  type KycStatus,
  type KycUploadSlot,
} from "@/lib/kyc";
import { verifyKycDocumentBytes } from "@/lib/kyc/verify";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

/** Soft limit per file — keeps the AI request under serverless body limits. */
const MAX_BYTES = 3 * 1024 * 1024;

function extFor(mediaType: string): string {
  if (mediaType === "application/pdf") return "pdf";
  if (mediaType === "image/png") return "png";
  if (mediaType === "image/webp") return "webp";
  return "jpg";
}

async function readDoc(
  form: FormData,
  slot: KycUploadSlot,
): Promise<{ bytes: Uint8Array; mediaType: string }> {
  const file = form.get(slot);
  if (!(file instanceof File) || file.size <= 0) {
    throw new Error(`${KYC_UPLOAD_LABELS[slot]} is required`);
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error(`${KYC_UPLOAD_LABELS[slot]} must be JPG, PNG, WebP, or PDF`);
  }
  if (file.size > MAX_BYTES) {
    throw new Error(`${KYC_UPLOAD_LABELS[slot]} is too large (max 3 MB)`);
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  return { bytes, mediaType: file.type };
}

/**
 * AI checks Aadhaar front+back, PAN, and Passport first.
 * Blob upload + verified status only happen when AI passes.
 */
export async function POST(req: NextRequest) {
  try {
    await ensureIndexes();
    const auth = await requireProfile("work");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    if (!auth.user.id) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    const form = await req.formData();
    let aadhaarFront: Awaited<ReturnType<typeof readDoc>>;
    let aadhaarBack: Awaited<ReturnType<typeof readDoc>>;
    let pan: Awaited<ReturnType<typeof readDoc>>;
    let passport: Awaited<ReturnType<typeof readDoc>>;
    try {
      [aadhaarFront, aadhaarBack, pan, passport] = await Promise.all([
        readDoc(form, "aadhaarFront"),
        readDoc(form, "aadhaarBack"),
        readDoc(form, "pan"),
        readDoc(form, "passport"),
      ]);
    } catch (e: unknown) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Invalid documents" },
        { status: 400 },
      );
    }

    const analysis = await verifyKycDocumentBytes({
      aadhaarFront,
      aadhaarBack,
      pan,
      passport,
    });

    const now = new Date();
    const db = client.db(DB_NAME);
    const users = db.collection(COLLECTIONS.USERS_COLLECTION);
    const userFilter = { _id: matchId(auth.user.id) as never };

    if (!analysis.overallAuthentic) {
      const status: KycStatus = "failed";
      const fields: KycFields = {
        kycStatus: status,
        kycAnalysis: analysis,
        kycUpdatedAt: now,
      };
      await users.updateOne(userFilter, {
        $set: fields,
        $unset: { kycDocuments: "", kycVerifiedAt: "" },
      });

      return NextResponse.json({
        kyc: toKycPublicState(fields),
        uploaded: false,
      });
    }

    const bySlot: Record<
      KycUploadSlot,
      { bytes: Uint8Array; mediaType: string }
    > = {
      aadhaarFront,
      aadhaarBack,
      pan,
      passport,
    };

    const uploaded = {} as Record<KycUploadSlot, KycDocumentFile>;
    await Promise.all(
      KYC_UPLOAD_SLOTS.map(async (slot) => {
        const doc = bySlot[slot];
        const pathname = blobPathname(
          `kyc/${auth.user.id}/${slot}.${extFor(doc.mediaType)}`,
        );
        const result = await put(pathname, Buffer.from(doc.bytes), {
          access: "public",
          contentType: doc.mediaType,
          addRandomSuffix: true,
        });
        uploaded[slot] = {
          url: result.url,
          pathname: result.pathname,
          contentType: doc.mediaType,
          uploadedAt: now,
        };
      }),
    );

    const status: KycStatus = "verified";
    const fields: KycFields = {
      kycStatus: status,
      kycDocuments: uploaded,
      kycAnalysis: analysis,
      kycVerifiedAt: now,
      kycUpdatedAt: now,
    };
    await users.updateOne(userFilter, { $set: fields });

    return NextResponse.json({
      kyc: toKycPublicState(fields),
      uploaded: true,
    });
  } catch (error) {
    console.error("POST /api/kyc/verify:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "KYC verification failed. Please try again.",
      },
      { status: 500 },
    );
  }
}
