"use client";

import { upload } from "@vercel/blob/client";
import {
  BLOB_HANDLE_UPLOAD_URL,
  BLOB_MAX_BYTES,
  BLOB_MULTIPART_THRESHOLD,
  blobPathname,
  normalizeBlobContentType,
} from "@/lib/blob/pathname";
import { asUploadableBlob } from "@/lib/native/media-blob";
import { blobUploadNeedsSimplePut } from "@/lib/native/platform";

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

const UPLOAD_TIMEOUT_MS = 5 * 60 * 1000;

function uploadErrorMessage(error: unknown): string {
  if (
    (error instanceof DOMException || error instanceof Error) &&
    error.name === "AbortError"
  ) {
    return "Upload timed out. Check your connection and try again.";
  }
  if (error instanceof Error && error.message.trim()) {
    if (/retrieve the client token/i.test(error.message)) {
      return "Could not start the upload. Sign in again and retry.";
    }
    return error.message.replace(/^Vercel Blob:\s*/i, "");
  }
  return "Could not upload the file.";
}

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

  if (opts.file.size <= 0) {
    throw new Error("Cannot upload an empty file");
  }
  const maxBytes = opts.maxBytes ?? BLOB_MAX_BYTES;
  if (opts.file.size > maxBytes) {
    throw new Error(
      `File is too large (max ${Math.round(maxBytes / (1024 * 1024))} MB)`,
    );
  }

  const simplePut = blobUploadNeedsSimplePut();
  const body = await asUploadableBlob(opts.file, contentType);

  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    UPLOAD_TIMEOUT_MS,
  );
  opts.onProgress?.(0);

  try {
    const result = await upload(pathname, body, {
      access: "private",
      handleUploadUrl: BLOB_HANDLE_UPLOAD_URL,
      contentType,
      // Streaming multipart + progress hangs in WKWebView / Safari.
      multipart: !simplePut && body.size > BLOB_MULTIPART_THRESHOLD,
      abortSignal: controller.signal,
      clientPayload: opts.clientPayload
        ? JSON.stringify(opts.clientPayload)
        : undefined,
      onUploadProgress:
        simplePut || !opts.onProgress
          ? undefined
          : (e) => {
              opts.onProgress?.(e.percentage);
            },
    });

    return {
      url: result.url,
      pathname: result.pathname,
      contentType: result.contentType,
    };
  } catch (error) {
    throw new Error(uploadErrorMessage(error));
  } finally {
    window.clearTimeout(timeoutId);
  }
}
