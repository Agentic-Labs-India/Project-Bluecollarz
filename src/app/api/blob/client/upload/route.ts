import { NextResponse } from "next/server";
import { handleBlobClientUpload } from "@/lib/blob/server/upload";

/** Token-only route for browser → Vercel Blob uploads. */
export async function POST(request: Request): Promise<NextResponse> {
  return handleBlobClientUpload(request);
}
