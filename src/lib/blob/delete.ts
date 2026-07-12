"use client";

import {
  BLOB_DELETE_URL,
  isBlobUrlUnderRoot,
  isVercelBlobUrl,
} from "@/lib/blob/pathname";

/**
 * Delete a blob by URL from the browser.
 * Calls a thin auth route — the file itself is removed by Vercel Blob, not proxied.
 */
export async function deleteBlob(url: string): Promise<void> {
  if (!url || !isVercelBlobUrl(url)) {
    throw new Error("Invalid blob URL");
  }
  if (!isBlobUrlUnderRoot(url)) {
    throw new Error("Blob URL is outside this environment's folder");
  }

  const res = await fetch(BLOB_DELETE_URL, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    let message = "Failed to delete blob";
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
}
