import "server-only";

import { del } from "@vercel/blob";
import { isVercelBlobUrl } from "@/lib/blob/pathname";

/** Best-effort delete of Vercel Blob URLs (never throws). */
export async function deleteBlobUrls(
  urls: Array<string | null | undefined>,
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
    await del(unique);
  } catch (error) {
    console.warn("deleteBlobUrls:", error);
  }
}
