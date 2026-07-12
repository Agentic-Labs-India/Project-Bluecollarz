/**
 * All Blob objects live under `{DB_NAME}/…` so envs (dev/staging/prod)
 * stay isolated in the same store.
 */

export const BLOB_MAX_BYTES = 500 * 1024 * 1024; // 500 MB
/** Multipart kicks in above this (Vercel serverless body limit ~4.5 MB). */
export const BLOB_MULTIPART_THRESHOLD = 4 * 1024 * 1024;

export const BLOB_HANDLE_UPLOAD_URL = "/api/blob/client-upload";
export const BLOB_DELETE_URL = "/api/blob/delete";

export function getBlobRoot(): string {
  const name = process.env.DB_NAME?.trim();
  if (!name) {
    throw new Error("DB_NAME is required for blob pathnames");
  }
  return name;
}

/** Join path segments under the DB_NAME root. Idempotent if already prefixed. */
export function blobPathname(...parts: (string | number)[]): string {
  const root = getBlobRoot();
  const joined = parts
    .map((p) => String(p).replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/")
    .replace(/\/+/g, "/");

  if (joined === root || joined.startsWith(`${root}/`)) {
    return joined;
  }
  return `${root}/${joined}`;
}

export function isUnderBlobRoot(pathname: string): boolean {
  const root = getBlobRoot();
  const clean = pathname.replace(/^\/+/, "");
  return clean === root || clean.startsWith(`${root}/`);
}

export function isVercelBlobUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host.endsWith("blob.vercel-storage.com");
  } catch {
    return false;
  }
}

/** True if the blob URL's object path is under `{DB_NAME}/`. */
export function isBlobUrlUnderRoot(url: string): boolean {
  if (!isVercelBlobUrl(url)) return false;
  try {
    const root = getBlobRoot();
    const { pathname } = new URL(url);
    return pathname.includes(`/${root}/`);
  } catch {
    return false;
  }
}
