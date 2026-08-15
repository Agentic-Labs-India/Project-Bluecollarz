/**
 * All Blob objects live under `{DB_NAME}/…` so envs (dev/staging/prod)
 * stay isolated in the same store.
 */

export const BLOB_MAX_BYTES = 500 * 1024 * 1024; // 500 MB
/** Multipart kicks in above this (Vercel serverless body limit ~4.5 MB). */
export const BLOB_MULTIPART_THRESHOLD = 4 * 1024 * 1024;

export const BLOB_HANDLE_UPLOAD_URL = "/api/blob/client-upload";

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

/** Reject path traversal / weird segments before prefix checks. */
function isSafeBlobPathname(pathname: string): boolean {
  const clean = pathname.replace(/^\/+/, "");
  if (!clean || clean.includes("..") || clean.includes("\\")) return false;
  if (clean.split("/").some((seg) => !seg || seg === "." || seg === "..")) {
    return false;
  }
  return true;
}

function isUnderBlobRoot(pathname: string): boolean {
  if (!isSafeBlobPathname(pathname)) return false;
  const root = getBlobRoot();
  const clean = pathname.replace(/^\/+/, "");
  return clean === root || clean.startsWith(`${root}/`);
}

/** Path relative to `{DB_NAME}/`, or null if not under root. */
export function blobPathRelativeToRoot(pathname: string): string | null {
  if (!isUnderBlobRoot(pathname)) return null;
  const root = getBlobRoot();
  const clean = pathname.replace(/^\/+/, "");
  if (clean === root) return "";
  return clean.slice(root.length + 1);
}

export function isVercelBlobUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host.endsWith("blob.vercel-storage.com");
  } catch {
    return false;
  }
}

/**
 * Interview recordings must live under `{DB_NAME}/interviews/{interviewId}/…`
 * on Vercel Blob.
 */
export function isInterviewRecordingUrl(
  url: string,
  interviewId: string,
): boolean {
  if (!isVercelBlobUrl(url) || !interviewId) return false;
  try {
    const root = getBlobRoot();
    const { pathname } = new URL(url);
    const decoded = decodeURIComponent(pathname);
    const marker = `/${root}/interviews/${interviewId}/`;
    return decoded.includes(marker);
  } catch {
    return false;
  }
}

/** Blog cover images: `{DB_NAME}/admin/blog/…` on Vercel Blob. */
export function isBlogCoverImageUrl(url: string): boolean {
  if (!isVercelBlobUrl(url)) return false;
  try {
    const root = getBlobRoot();
    const { pathname } = new URL(url);
    const decoded = decodeURIComponent(pathname);
    return decoded.includes(`/${root}/admin/blog/`);
  } catch {
    return false;
  }
}
