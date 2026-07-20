import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import client, { DB_NAME, COLLECTIONS, matchId } from "@/lib/db";
import { ensureIndexes } from "@/lib/db/indexes";
import { requireProfile } from "@/lib/api/session";
import { blobPathname } from "@/lib/blob/pathname";
import type { CandidateProfileFields } from "@/lib/candidate/profile";
import { formatDateOnly } from "@/lib/dates";
import {
  KYC_DEFERABLE_SLOTS,
  KYC_UPLOAD_LABELS,
  KYC_UPLOAD_SLOTS,
  toKycPublicState,
  type KycDeferableSlot,
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

async function readOptionalDoc(
  form: FormData,
  slot: KycUploadSlot,
): Promise<{ bytes: Uint8Array; mediaType: string } | null> {
  const file = form.get(slot);
  if (!(file instanceof File) || file.size <= 0) return null;
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error(`${KYC_UPLOAD_LABELS[slot]} must be JPG, PNG, WebP, or PDF`);
  }
  if (file.size > MAX_BYTES) {
    throw new Error(`${KYC_UPLOAD_LABELS[slot]} is too large (max 3 MB)`);
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  return { bytes, mediaType: file.type };
}

async function readRequiredDoc(
  form: FormData,
  slot: KycUploadSlot,
): Promise<{ bytes: Uint8Array; mediaType: string }> {
  const doc = await readOptionalDoc(form, slot);
  if (!doc) {
    throw new Error(`${KYC_UPLOAD_LABELS[slot]} is required`);
  }
  return doc;
}

function parseDeferred(form: FormData): {
  pan: boolean;
  passport: boolean;
  undertaking: boolean;
} {
  const flag = (key: string) => {
    const v = form.get(key);
    return v === "1" || v === "true" || v === "on";
  };
  return {
    pan: flag("deferPan"),
    passport: flag("deferPassport"),
    undertaking: flag("undertakingAccepted"),
  };
}

/**
 * AI checks Aadhaar (required) + optional PAN/Passport.
 * Deferred PAN/Passport require a submit-later undertaking.
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

    const users = client.db(DB_NAME).collection(COLLECTIONS.USERS_COLLECTION);
    const userFilter = { _id: matchId(auth.user.id) as never };

    const userDoc = await users.findOne(userFilter, {
      projection: {
        name: 1,
        dateOfBirth: 1,
        location: 1,
        residenceCity: 1,
        residenceState: 1,
        residenceCountry: 1,
        residencePostalCode: 1,
      },
    });
    const profileFields = userDoc as
      | (CandidateProfileFields & { name?: string })
      | null;
    const candidateName = (profileFields?.name ?? "").trim();
    if (!candidateName) {
      return NextResponse.json(
        {
          error:
            "Complete your profile name before KYC. Documents must match your registered identity.",
        },
        { status: 400 },
      );
    }

    const form = await req.formData();
    const deferred = parseDeferred(form);

    if ((deferred.pan || deferred.passport) && !deferred.undertaking) {
      return NextResponse.json(
        {
          error:
            "Accept the undertaking to submit missing PAN/Passport later before continuing.",
        },
        { status: 400 },
      );
    }

    let aadhaarFront: Awaited<ReturnType<typeof readRequiredDoc>>;
    let aadhaarBack: Awaited<ReturnType<typeof readRequiredDoc>>;
    let pan: Awaited<ReturnType<typeof readOptionalDoc>> = null;
    let passport: Awaited<ReturnType<typeof readOptionalDoc>> = null;
    try {
      aadhaarFront = await readRequiredDoc(form, "aadhaarFront");
      aadhaarBack = await readRequiredDoc(form, "aadhaarBack");
      if (!deferred.pan) {
        pan = await readRequiredDoc(form, "pan");
      }
      if (!deferred.passport) {
        passport = await readRequiredDoc(form, "passport");
      }
    } catch (e: unknown) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Invalid documents" },
        { status: 400 },
      );
    }

    const analysis = await verifyKycDocumentBytes(
      {
        aadhaarFront,
        aadhaarBack,
        pan,
        passport,
      },
      {
        name: candidateName,
        dateOfBirth: formatDateOnly(profileFields?.dateOfBirth),
        residenceCity: profileFields?.residenceCity ?? "",
        residenceState: profileFields?.residenceState ?? "",
        residenceCountry: profileFields?.residenceCountry ?? "",
        residencePostalCode: profileFields?.residencePostalCode ?? "",
        location: profileFields?.location ?? "",
      },
      { pan: deferred.pan, passport: deferred.passport },
    );

    const now = new Date();

    if (!analysis.overallAuthentic) {
      const status: KycStatus = "failed";
      const fields: KycFields = {
        kycStatus: status,
        kycAnalysis: analysis,
        kycUpdatedAt: now,
      };
      await users.updateOne(userFilter, {
        $set: fields,
        $unset: {
          kycDocuments: "",
          kycVerifiedAt: "",
          kycDeferred: "",
        },
      });

      return NextResponse.json({
        kyc: toKycPublicState(fields),
        uploaded: false,
      });
    }

    const toUpload: Partial<
      Record<KycUploadSlot, { bytes: Uint8Array; mediaType: string }>
    > = {
      aadhaarFront,
      aadhaarBack,
    };
    if (pan) toUpload.pan = pan;
    if (passport) toUpload.passport = passport;

    const uploaded: Partial<Record<KycUploadSlot, KycDocumentFile>> = {};
    await Promise.all(
      (Object.keys(toUpload) as KycUploadSlot[]).map(async (slot) => {
        const doc = toUpload[slot];
        if (!doc) return;
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

    const deferredSlots = KYC_DEFERABLE_SLOTS.filter(
      (slot) => deferred[slot as KycDeferableSlot],
    );
    const status: KycStatus = "verified";
    const fields: KycFields = {
      kycStatus: status,
      kycDocuments: uploaded,
      kycAnalysis: analysis,
      kycVerifiedAt: now,
      kycUpdatedAt: now,
      ...(deferredSlots.length
        ? {
            kycDeferred: {
              pan: deferred.pan || undefined,
              passport: deferred.passport || undefined,
              undertakingAcceptedAt: now,
            },
          }
        : {}),
    };

    await users.updateOne(userFilter, {
      $set: fields,
      ...(deferredSlots.length
        ? {}
        : { $unset: { kycDeferred: "" } }),
    });

    return NextResponse.json({
      kyc: toKycPublicState(fields),
      uploaded: true,
    });
  } catch (error) {
    console.error("POST /api/candidate/kyc/verify:", error);
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
