import { type HandleUploadBody, handleUpload } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import {
  BLOB_MAX_BYTES,
  blobPathRelativeToRoot,
  COMPANY_DOC_MAX_BYTES,
  getBlobRoot,
  isCompanyDocumentRelativePath,
  isMedicalReportRelativePath,
  MEDICAL_REPORT_MAX_BYTES,
} from "@/lib/blob/pathname";
import { blobReadWriteToken } from "@/lib/blob/token";
import client, { COLLECTIONS, DB_NAME, isId, matchId } from "@/lib/db";

/**
 * Token-only route for browser → Vercel Blob uploads.
 * Allowed prefixes:
 * - `interviews/{interviewId}/…` (work; must own the interview)
 * - `admin/email/…` (admin only)
 * - `admin/medical/{appointmentId}/…` (admin only)
 * - `users/{userId}/…` (own user id only)
 */
export async function POST(request: Request): Promise<NextResponse> {
  const auth = await requireUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const root = getBlobRoot();
    const jsonResponse = await handleUpload({
      body,
      request,
      token: blobReadWriteToken(),
      onBeforeGenerateToken: async (pathname) => {
        const relative = blobPathRelativeToRoot(pathname);
        if (relative === null) {
          throw new Error(`Uploads must be under ${root}/`);
        }

        const segments = relative.split("/").filter(Boolean);
        const kind = segments[0];
        let maximumSizeInBytes = BLOB_MAX_BYTES;
        let allowedContentTypes = [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/gif",
          "application/pdf",
          "video/webm",
          "video/mp4",
          "video/quicktime",
          "audio/webm",
          "audio/mpeg",
          "audio/wav",
        ];
        let validUntil: number | undefined;

        if (kind === "interviews") {
          if (auth.user.profileType !== "work") {
            throw new Error("Interview uploads require a candidate profile");
          }
          const interviewId = segments[1];
          if (!isId(interviewId) || segments.length < 3) {
            throw new Error("Invalid interview upload path");
          }
          const owned = await client
            .db(DB_NAME)
            .collection(COLLECTIONS.INTERVIEWS)
            .findOne(
              {
                _id: matchId(interviewId) as never,
                applicantId: auth.user.id,
              } as never,
              { projection: { _id: 1 } },
            );
          if (!owned) {
            throw new Error("Interview not found");
          }
          allowedContentTypes = ["video/*", "audio/*"];
          validUntil = Date.now() + 2 * 60 * 60 * 1000;
        } else if (kind === "admin" && segments[1] === "email") {
          if (auth.user.profileType !== "admin") {
            throw new Error("Admin email uploads require an admin profile");
          }
          if (segments.length < 3) {
            throw new Error("Invalid admin email upload path");
          }
        } else if (kind === "admin" && segments[1] === "blog") {
          if (auth.user.profileType !== "admin") {
            throw new Error("Blog uploads require an admin profile");
          }
          if (segments.length < 3) {
            throw new Error("Invalid blog upload path");
          }
        } else if (kind === "admin" && segments[1] === "medical") {
          if (auth.user.profileType !== "admin") {
            throw new Error("Medical report uploads require an admin profile");
          }
          const appointmentId = segments[2];
          if (
            !isId(appointmentId) ||
            !isMedicalReportRelativePath(relative, appointmentId)
          ) {
            throw new Error("Invalid medical report path");
          }
          maximumSizeInBytes = MEDICAL_REPORT_MAX_BYTES;
          allowedContentTypes = [
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/webp",
          ];
        } else if (kind === "users") {
          if (segments[1] !== auth.user.id || segments.length < 3) {
            throw new Error("User uploads must be under your own folder");
          }
          if (segments[2] === "company") {
            if (auth.user.profileType !== "hire") {
              throw new Error(
                "Company document uploads require a hire profile",
              );
            }
            if (!isCompanyDocumentRelativePath(relative, auth.user.id)) {
              throw new Error("Invalid company document path");
            }
            maximumSizeInBytes = COMPANY_DOC_MAX_BYTES;
            allowedContentTypes = [
              "application/pdf",
              "image/jpeg",
              "image/png",
              "image/webp",
            ];
          }
        } else {
          throw new Error("Upload path not allowed");
        }

        return {
          allowedContentTypes,
          maximumSizeInBytes,
          addRandomSuffix: true,
          ...(validUntil ? { validUntil } : {}),
          tokenPayload: JSON.stringify({
            userId: auth.user.id,
            profileType: auth.user.profileType,
          }),
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("POST /api/blob/client-upload:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload token failed" },
      { status: 400 },
    );
  }
}
