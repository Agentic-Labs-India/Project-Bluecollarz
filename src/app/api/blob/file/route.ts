import { get } from "@vercel/blob";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireUser, rethrowIfPrerenderAbort } from "@/lib/auth/session";
import {
  blobKindFromRelative,
  blobPathname,
  blobPathRelativeToRoot,
  isPubliclyServedBlobKind,
} from "@/lib/blob/pathname";
import { blobReadWriteToken } from "@/lib/blob/token";
import {
  hasGrantedPurposes,
  INTERVIEW_RELEASE_REQUIRED_PURPOSES,
} from "@/lib/compliance/consent";
import client, { COLLECTIONS, DB_NAME, isId, matchId } from "@/lib/db";
import type { JobDocument } from "@/lib/jobs";

type Viewer = {
  id: string;
  profileType: string;
};

/** Candidate owner, or the hirer for that role once interview release consent is granted. */
async function canReadInterview(
  viewer: Viewer,
  interviewId: string,
): Promise<boolean> {
  if (!isId(interviewId)) return false;
  const interview = await client
    .db(DB_NAME)
    .collection<{ _id: unknown; applicantId?: string; jobId?: string }>(
      COLLECTIONS.INTERVIEWS,
    )
    .findOne(
      { _id: matchId(interviewId) as never },
      { projection: { applicantId: 1, jobId: 1 } },
    );
  if (!interview?.applicantId) return false;

  if (interview.applicantId === viewer.id) return true;
  if (viewer.profileType !== "hire" || !interview.jobId) return false;

  const job = await client
    .db(DB_NAME)
    .collection<JobDocument>(COLLECTIONS.JOBS)
    .findOne(
      { _id: matchId(interview.jobId) as never, ownerId: matchId(viewer.id) },
      { projection: { _id: 1 } },
    );
  if (!job) return false;

  return hasGrantedPurposes(
    interview.applicantId,
    INTERVIEW_RELEASE_REQUIRED_PURPOSES,
  );
}

/** Admins run the medical desk; the candidate reads their own fitness reports. Hirers never do. */
async function canReadMedical(
  viewer: Viewer,
  appointmentId: string,
): Promise<boolean> {
  if (!isId(appointmentId)) return false;
  if (viewer.profileType === "admin") return true;
  if (viewer.profileType !== "work") return false;

  const appointment = await client
    .db(DB_NAME)
    .collection<{ _id: unknown; applicantId?: string }>(
      COLLECTIONS.MEDICAL_APPOINTMENTS,
    )
    .findOne(
      { _id: matchId(appointmentId) as never },
      { projection: { applicantId: 1 } },
    );
  return appointment?.applicantId === viewer.id;
}

async function isAuthorized(
  viewer: Viewer,
  relative: string,
): Promise<boolean> {
  const segments = relative.split("/").filter(Boolean);
  switch (blobKindFromRelative(relative)) {
    case "interview":
      return canReadInterview(viewer, segments[1]);
    case "medical":
      return canReadMedical(viewer, segments[2]);
    case "company":
      return viewer.profileType === "admin" || segments[1] === viewer.id;
    case "knowledge":
      return viewer.profileType === "admin";
    default:
      return false;
  }
}

/** Strip anything that could break out of the Content-Disposition quoting. */
function safeFilename(relative: string): string {
  const name = relative.split("/").pop() || "file";
  return name.replace(/["\\\r\n]/g, "").slice(0, 200) || "file";
}

/**
 * Streams private Blob objects (interview recordings, medical reports, company
 * documents) to viewers who are entitled to them. Private blobs have no
 * shareable URL, so this is the only read path.
 */
export async function GET(request: NextRequest) {
  // Opt into request time before searchParams. Blog pages fetch this URL
  // during prerender; without headers() Cache Components logs a bail-out.
  await headers();
  try {
    const requested = request.nextUrl.searchParams.get("path");
    if (!requested) {
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    }

    const pathname = blobPathname(requested);
    const relative = blobPathRelativeToRoot(pathname);
    if (relative === null) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const kind = blobKindFromRelative(relative);
    const publiclyServed = isPubliclyServedBlobKind(kind);

    if (!publiclyServed) {
      const auth = await requireUser();
      if (!auth.ok) {
        return NextResponse.json(
          { error: auth.error },
          { status: auth.status },
        );
      }

      const viewer: Viewer = {
        id: auth.user.id,
        profileType: auth.user.profileType,
      };
      if (!(await isAuthorized(viewer, relative))) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    }

    const ifNoneMatch = request.headers.get("if-none-match") ?? undefined;
    const range = request.headers.get("range") ?? undefined;

    const result = await get(pathname, {
      access: "private",
      token: blobReadWriteToken(),
      abortSignal: request.signal,
      ...(ifNoneMatch ? { ifNoneMatch } : {}),
      ...(range ? { headers: { Range: range } } : {}),
    });
    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const cacheControl = publiclyServed
      ? "public, max-age=3600"
      : "private, no-store";

    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: result.blob.etag,
          "Cache-Control": cacheControl,
        },
      });
    }

    if (result.statusCode !== 200 || !result.stream) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const disposition =
      request.nextUrl.searchParams.get("download") === "1"
        ? "attachment"
        : "inline";
    const contentRange = result.headers.get("content-range");
    const contentLength =
      result.headers.get("content-length") ?? String(result.blob.size);
    const headers = new Headers({
      "Content-Type": result.blob.contentType,
      "Content-Length": contentLength,
      "Content-Disposition": `${disposition}; filename="${safeFilename(relative)}"`,
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff",
      ETag: result.blob.etag,
      "Accept-Ranges": "bytes",
    });
    if (contentRange) headers.set("Content-Range", contentRange);

    return new NextResponse(result.stream, {
      status: contentRange ? 206 : 200,
      headers,
    });
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    console.error("GET /api/blob/file:", error);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
