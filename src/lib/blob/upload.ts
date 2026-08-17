"use client";

import { upload } from "@vercel/blob/client";
import {
  BLOB_HANDLE_UPLOAD_URL,
  BLOB_MAX_BYTES,
  BLOB_MULTIPART_THRESHOLD,
  blobPathname,
  normalizeBlobContentType,
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
  /** Override the default 500 MB cap (e.g. company docs = 4 MB). */
  maxBytes?: number;
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
  const contentType = normalizeBlobContentType(
    opts.contentType || opts.file.type,
  );

  const file = new File(
    [opts.file],
    opts.file instanceof File
      ? opts.file.name
      : pathname.split("/").pop() || "upload.bin",
    { type: contentType },
  );

  if (file.size <= 0) {
    throw new Error("Cannot upload an empty file");
  }
  const maxBytes = opts.maxBytes ?? BLOB_MAX_BYTES;
  if (file.size > maxBytes) {
    throw new Error(
      `File is too large (max ${Math.round(maxBytes / (1024 * 1024))} MB)`,
    );
  }

  const result = await upload(pathname, file, {
    access: "private",
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
