"use client";

import { upload } from "@vercel/blob/client";
import {
  BLOB_HANDLE_UPLOAD_URL,
  BLOB_MAX_BYTES,
  BLOB_MULTIPART_THRESHOLD,
  blobPathname,
} from "@/lib/blob/pathname";

export type BlobUploadResult = {
  url: string;
  pathname: string;
  contentType?: string;
};

export type BlobUploadOptions = {
  file: File | Blob;
  /**
   * Path relative to `DB_NAME` (or already prefixed).
   * Example: `interviews/abc/clip.webm` → `{DB_NAME}/interviews/abc/clip.webm`
   */
  pathname: string;
  contentType?: string;
  /** Extra JSON for the token route (auth / bookkeeping). */
  clientPayload?: Record<string, unknown>;
  onProgress?: (percent: number) => void;
};

/**
 * Upload any file from the browser straight to Vercel Blob.
 * Supports large files (up to 500 MB) via multipart; bytes never hit Next.js.
 */
export async function uploadBlob(
  opts: BlobUploadOptions,
): Promise<BlobUploadResult> {
  const pathname = blobPathname(opts.pathname);

  const file =
    opts.file instanceof File
      ? opts.file
      : new File([opts.file], pathname.split("/").pop() || "upload.bin", {
          type:
            opts.contentType ||
            opts.file.type ||
            "application/octet-stream",
        });

  if (file.size <= 0) {
    throw new Error("Cannot upload an empty file");
  }
  if (file.size > BLOB_MAX_BYTES) {
    throw new Error(
      `File is too large (max ${Math.round(BLOB_MAX_BYTES / (1024 * 1024))} MB)`,
    );
  }

  const contentType =
    opts.contentType || file.type || "application/octet-stream";

  const result = await upload(pathname, file, {
    access: "public",
    handleUploadUrl: BLOB_HANDLE_UPLOAD_URL,
    contentType,
    multipart: file.size > BLOB_MULTIPART_THRESHOLD,
    clientPayload: opts.clientPayload
      ? JSON.stringify(opts.clientPayload)
      : undefined,
    onUploadProgress: opts.onProgress
      ? (e) => {
          opts.onProgress?.(e.percentage);
        }
      : undefined,
  });

  return {
    url: result.url,
    pathname: result.pathname,
    contentType: result.contentType,
  };
}
