import "server-only";

/**
 * Single private Vercel Blob store. `BLOB_READ_WRITE_TOKEN` must be the
 * read-write token of a store created with access Private.
 */
export function blobReadWriteToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required");
  }
  return token;
}
