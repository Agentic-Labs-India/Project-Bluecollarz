import { del } from "@vercel/blob";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { isBlobUrlUnderRoot, isVercelBlobUrl } from "@/lib/blob/pathname";

/**
 * Auth-gated delete for blobs under `{DB_NAME}/`.
 * Does not proxy file bytes — only instructs Vercel Blob to remove the object.
 */
export async function DELETE(request: Request): Promise<NextResponse> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const url =
    typeof body === "object" &&
    body !== null &&
    typeof (body as { url?: unknown }).url === "string"
      ? (body as { url: string }).url
      : null;

  if (!url || !isVercelBlobUrl(url) || !isBlobUrlUnderRoot(url)) {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  try {
    await del(url);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/blob/delete:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
