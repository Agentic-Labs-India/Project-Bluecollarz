/**
 * MediaRecorder Blobs are lazy concatenations of timeslices. Read them into a
 * File before fetch/FormData so the body has a known size and type.
 * `<input type="file">` Files are already on disk; skip those.
 */
export async function asUploadableBlob(
  file: Blob,
  contentType: string,
  filename = "upload",
): Promise<Blob> {
  if (file.size <= 0) return file;
  if (file instanceof File) return file;
  const buffer = await file.arrayBuffer();
  return new File([buffer], filename, {
    type: contentType || file.type || "application/octet-stream",
  });
}
