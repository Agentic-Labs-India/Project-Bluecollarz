import { blobUploadNeedsSimplePut } from "@/lib/native/platform";

/**
 * MediaRecorder Blobs can stall fetch/FormData on WebKit until fully read.
 * Files from `<input type="file">` are already materialized — skip those.
 */
export async function asUploadableBlob(
  file: Blob,
  contentType: string,
): Promise<Blob> {
  if (file.size <= 0) return file;
  if (!blobUploadNeedsSimplePut()) return file;
  if (file instanceof File) return file;
  const buffer = await file.arrayBuffer();
  return new Blob([buffer], { type: contentType || file.type });
}
