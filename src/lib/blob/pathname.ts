/**
 * Shared path + URL helpers for the private Vercel Blob store.
 * All objects live under `{DB_NAME}/…` so envs (dev/staging/prod) stay isolated.
 *
 * Uploads/deletes live in:
 * - `@/lib/blob/client/upload` — browser PUT (`uploadBlob`)
 * - `@/lib/blob/server/upload` — token minting for that PUT
 * - `@/lib/blob/server/delete` — `deleteBlobUrls`
 * - `@/lib/blob/server/get` — authorized/private reads
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
/** Knowledge-base PDFs ingested for RAG. */
export const KNOWLEDGE_PDF_MAX_BYTES = 20 * 1024 * 1024;
export const KNOWLEDGE_PDF_MAX_MB = 20;

export const BLOB_HANDLE_UPLOAD_URL = "/api/blob/client/upload";

/** Strip codec / charset parameters so Blob `allowedContentTypes` can match. */
export function normalizeBlobContentType(value: string | undefined): string {
  const base = (value ?? "").split(";")[0].trim().toLowerCase();
  return base || "application/octet-stream";
}

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

export type BlobAccess = "public" | "private";

/** Path families under the root. Store access is always private. */
export type BlobKind =
  | "interview"
  | "medical"
  | "company"
  | "blog"
  | "email"
  | "knowledge";

/** Only marketing and outbound-email assets are world-readable. */
const PUBLIC_KINDS = new Set<BlobKind>(["blog", "email"]);

export function blobKindFromRelative(relative: string): BlobKind | null {
  const parts = relative.split("/").filter(Boolean);
  if (parts[0] === "interviews" && parts.length >= 3) return "interview";
  if (parts[0] === "admin" && parts[1] === "medical" && parts.length >= 4) {
    return "medical";
  }
  if (parts[0] === "admin" && parts[1] === "blog" && parts.length >= 3) {
    return "blog";
  }
  if (parts[0] === "admin" && parts[1] === "email" && parts.length >= 3) {
    return "email";
  }
  if (parts[0] === "admin" && parts[1] === "knowledge" && parts.length >= 3) {
    return "knowledge";
  }
  if (parts[0] === "users" && parts[2] === "company" && parts.length >= 4) {
    return "company";
  }
  return null;
}

/** Blog covers and outbound-email images are streamed without a session. */
export function isPubliclyServedBlobKind(kind: BlobKind | null): boolean {
  return kind !== null && PUBLIC_KINDS.has(kind);
}

/**
 * Vercel serves blobs from `{storeId}.{access}.blob.vercel-storage.com`.
 * Persist paths check the host so a public URL cannot be stored as private.
 */
export function blobAccessFromUrl(url: string): BlobAccess | null {
  try {
    const host = new URL(url).hostname;
    if (host.endsWith(".public.blob.vercel-storage.com")) return "public";
    if (host.endsWith(".private.blob.vercel-storage.com")) return "private";
    return null;
  } catch {
    return null;
  }
}

/** Persistable private object. Rejects public hosts; allows unlabeled store URLs. */
export function isStoredPrivateBlobUrl(url: string): boolean {
  return isVercelBlobUrl(url) && blobAccessFromUrl(url) !== "public";
}

function safeDecodePath(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Same-origin route that authorizes the viewer, then streams a private blob. */
export function blobFileUrl(pathnameOrUrl: string): string {
  const raw = pathnameOrUrl.startsWith("http")
    ? safeDecodePath(new URL(pathnameOrUrl).pathname)
    : pathnameOrUrl;
  return `/api/blob/file?path=${encodeURIComponent(raw.replace(/^\/+/, ""))}`;
}

/** Absolute file-proxy URL for Open Graph, email HTML, and other off-site fetches. */
export function blobAbsoluteFileUrl(pathnameOrUrl: string): string {
  const path = blobFileUrl(pathnameOrUrl);
  const origin = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.BETTER_AUTH_URL ||
    ""
  ).replace(/\/$/, "");
  return origin ? `${origin}${path}` : path;
}

/**
 * Interview recordings must live under `{DB_NAME}/interviews/{interviewId}/…`
 * on a private Vercel Blob store. Public URLs are rejected.
 */
export function isInterviewRecordingUrl(
  url: string,
  interviewId: string,
): boolean {
  if (!interviewId || !isStoredPrivateBlobUrl(url)) return false;
  try {
    const root = getBlobRoot();
    const decoded = safeDecodePath(new URL(url).pathname);
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
  if (!appointmentId || !isStoredPrivateBlobUrl(url)) return false;
  try {
    const root = getBlobRoot();
    const decoded = safeDecodePath(new URL(url).pathname);
    return decoded.includes(`/${root}/admin/medical/${appointmentId}/`);
  } catch {
    return false;
  }
}

/** Admin knowledge PDFs: `{DB_NAME}/admin/knowledge/…` */
export function isKnowledgePdfRelativePath(relative: string): boolean {
  const parts = relative.split("/").filter(Boolean);
  return parts[0] === "admin" && parts[1] === "knowledge" && parts.length >= 3;
}

/** Blog cover images: `{DB_NAME}/admin/blog/…` on Vercel Blob. */
export function isBlogCoverImageUrl(url: string): boolean {
  if (!isVercelBlobUrl(url)) return false;
  try {
    const root = getBlobRoot();
    const decoded = safeDecodePath(new URL(url).pathname);
    return decoded.includes(`/${root}/admin/blog/`);
  } catch {
    return false;
  }
}
