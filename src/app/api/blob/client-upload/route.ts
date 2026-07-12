import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import {
  BLOB_MAX_BYTES,
  getBlobRoot,
  isUnderBlobRoot,
} from "@/lib/blob/pathname";

/**
 * Token-only route for browser → Vercel Blob uploads (any path under DB_NAME).
 * File bytes never hit this server. Supports up to 500 MB via multipart.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const root = getBlobRoot();

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!isUnderBlobRoot(pathname)) {
          throw new Error(`Uploads must be under ${root}/`);
        }

        let payload: Record<string, unknown> = {};
        try {
          payload = clientPayload ? JSON.parse(clientPayload) : {};
        } catch {
          payload = {};
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
            "application/octet-stream",
          ],
          maximumSizeInBytes: BLOB_MAX_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            userId: session.user.id,
            ...payload,
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
