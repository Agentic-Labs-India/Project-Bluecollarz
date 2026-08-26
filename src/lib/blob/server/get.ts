import "server-only";

import { get } from "@vercel/blob";
import { blobReadWriteToken } from "@/lib/blob/server/token";

/** Read a private object from the store. Used by `/api/blob/file` and ingest. */
export async function getPrivateBlob(
  pathname: string,
  opts?: {
    abortSignal?: AbortSignal;
    ifNoneMatch?: string;
    range?: string;
    useCache?: boolean;
  },
) {
  return get(pathname, {
    access: "private",
    token: blobReadWriteToken(),
    abortSignal: opts?.abortSignal,
    useCache: opts?.useCache,
    ...(opts?.ifNoneMatch ? { ifNoneMatch: opts.ifNoneMatch } : {}),
    ...(opts?.range ? { headers: { Range: opts.range } } : {}),
  });
}
