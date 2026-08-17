/**
 * All Blob objects live under `{DB_NAME}/…` so envs (dev/staging/prod)
 * stay isolated in the same store.
 */

export const BLOB_MAX_BYTES = 500 * 1024 * 1024; // 500 MB
/** Multipart kicks in above this (Vercel serverless body limit ~4.5 MB). */
export const BLOB_MULTIPART_THRESHOLD = 4 * 1024 * 1024;
/** Company onboarding docs — hard cap (client + token route). */
export const COMPANY_DOC_MAX_BYTES = 4 * 1024 * 1024;
export const COMPANY_DOC_MAX_MB = 4;
/** Medical fitness reports uploaded by admin. */
export const MEDICAL_REPORT_MAX_BYTES = 8 * 1024 * 1024;
export const MEDICAL_REPORT_MAX_MB = 8;

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

/** Hire company docs: `{DB_NAME}/users/{userId}/company/…` */
export function isCompanyDocumentRelativePath(
  relative: string,
  userId: string,
): boolean {
  if (!userId) return false;
  const parts = relative.split("/").filter(Boolean);
  return (
    parts[0] === "users" &&
    parts[1] === userId &&
    parts[2] === "company" &&
    parts.length >= 4
  );
}

/** Admin medical reports: `{DB_NAME}/admin/medical/{appointmentId}/…` */
export function isMedicalReportRelativePath(
  relative: string,
  appointmentId: string,
): boolean {
  if (!appointmentId) return false;
  const parts = relative.split("/").filter(Boolean);
  return (
    parts[0] === "admin" &&
    parts[1] === "medical" &&
    parts[2] === appointmentId &&
    parts.length >= 4
  );
}

export function isMedicalReportUrl(
  url: string,
  appointmentId: string,
): boolean {
  if (!isVercelBlobUrl(url) || !appointmentId) return false;
  try {
    const root = getBlobRoot();
    const { pathname } = new URL(url);
    const decoded = decodeURIComponent(pathname);
    return decoded.includes(`/${root}/admin/medical/${appointmentId}/`);
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
