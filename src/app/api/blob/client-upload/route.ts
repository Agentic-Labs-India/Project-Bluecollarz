import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireUser } from "@/lib/api/session";
import client, { COLLECTIONS, DB_NAME, isId, matchId } from "@/lib/db";
import {
  BLOB_MAX_BYTES,
  blobPathRelativeToRoot,
  getBlobRoot,
} from "@/lib/blob/pathname";

/**
 * Token-only route for browser → Vercel Blob uploads.
 * Allowed prefixes:
 * - `interviews/{interviewId}/…` (work; must own the interview)
 * - `admin/email/…` (admin only)
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
      onBeforeGenerateToken: async (pathname) => {
        const relative = blobPathRelativeToRoot(pathname);
        if (relative === null) {
          throw new Error(`Uploads must be under ${root}/`);
        }

        const segments = relative.split("/").filter(Boolean);
        const kind = segments[0];

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
        } else if (kind === "admin" && segments[1] === "email") {
          if (auth.user.profileType !== "admin") {
            throw new Error("Admin email uploads require an admin profile");
          }
          if (segments.length < 3) {
            throw new Error("Invalid admin email upload path");
          }
        } else if (kind === "users") {
          if (segments[1] !== auth.user.id || segments.length < 3) {
            throw new Error("User uploads must be under your own folder");
          }
        } else {
          throw new Error("Upload path not allowed");
        }

        return {
          allowedContentTypes: [
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
          ],
          maximumSizeInBytes: BLOB_MAX_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            userId: auth.user.id,
            profileType: auth.user.profileType,
          }),
        };
      },
      onUploadCompleted: async () => {
        // May not fire on localhost; callers persist URLs themselves.
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
