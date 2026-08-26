import "server-only";

import { del } from "@vercel/blob";
import { isVercelBlobUrl } from "@/lib/blob/pathname";
import { blobReadWriteToken } from "@/lib/blob/server/token";

/** Delete Vercel Blob URLs. Best-effort unless `required` is set. */
export async function deleteBlobUrls(
  urls: Array<string | null | undefined>,
  opts?: { required?: boolean },
): Promise<void> {
  const unique = [
    ...new Set(
      urls.filter(
        (url): url is string => typeof url === "string" && isVercelBlobUrl(url),
      ),
    ),
  ];
  if (!unique.length) return;
  try {
    await del(unique, { token: blobReadWriteToken() });
  } catch (error) {
    console.warn("deleteBlobUrls:", error);
    if (opts?.required) throw error;
  }
}
