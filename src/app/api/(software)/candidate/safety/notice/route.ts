import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, rethrowIfPrerenderAbort } from "@/lib/auth/session";
import {
  getNotice,
  hasSeenNotice,
  NOTICE_VERSIONS,
  recordNoticeDelivery,
} from "@/lib/legal-safety/notices";
import { formatZodError } from "@/lib/utils";

const NOTICE_IDS = ["POL-0007", "POL-0005"] as const;

const querySchema = z.object({
  notice: z.enum(NOTICE_IDS),
  language_code: z.string().trim().max(10).optional(),
});

const bodySchema = z.object({
  notice: z.enum(NOTICE_IDS),
  language_code: z.string().trim().max(10).optional(),
  /**
   * The worker's teach-back, stored verbatim. It is not scored and it does not
   * gate anything; see POL-0006.
   */
  teach_back: z.string().trim().max(2000).optional(),
});

/** Fetch the wording to show, and whether this worker has already seen it. */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireProfile("work");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const parsed = querySchema.safeParse(
      Object.fromEntries(req.nextUrl.searchParams.entries()),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }

    const notice = getNotice(parsed.data.notice, parsed.data.language_code);
    const seen = await hasSeenNotice(auth.user.id, parsed.data.notice);

    if (!notice.available) {
      // Fail closed. The caller must route to a human rather than show the
      // worker a serious-safety warning in a language they may not read.
      return NextResponse.json({
        available: false,
        needsHumanDelivery: true,
        language: notice.language,
        seen,
      });
    }

    return NextResponse.json({
      available: true,
      needsHumanDelivery: false,
      language: notice.language,
      version: NOTICE_VERSIONS[parsed.data.notice],
      title: notice.wording.title,
      body: notice.wording.body,
      continueLabel: notice.wording.continueLabel,
      seen,
    });
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    console.error("GET /api/candidate/safety/notice:", error);
    return NextResponse.json(
      { error: "Failed to load notice" },
      { status: 500 },
    );
  }
}

/** Record that the worker was shown the notice. Never a consent record. */
export async function POST(request: Request) {
  try {
    const auth = await requireProfile("work");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }

    const notice = getNotice(parsed.data.notice, parsed.data.language_code);
    if (!notice.available) {
      // Unsupported language: record a deferred human-delivery, never a fake
      // warning in a language the worker may not read.
      const delivery = await recordNoticeDelivery({
        noticeId: parsed.data.notice,
        userId: auth.user.id,
        language: notice.language,
        bodyShown: "",
        noticeDeferred: true,
      });
      return NextResponse.json({
        deliveryId: delivery.deliveryId,
        version: delivery.noticeVersion,
        isConsent: false,
        noticeDeferred: true,
      });
    }

    // Store the wording from the registry rather than anything the client sent,
    // so the record cannot claim the worker saw text they never saw.
    const delivery = await recordNoticeDelivery({
      noticeId: parsed.data.notice,
      userId: auth.user.id,
      language: notice.language,
      bodyShown: notice.wording.body,
      teachBackResponse: parsed.data.teach_back ?? null,
    });

    return NextResponse.json({
      deliveryId: delivery.deliveryId,
      version: delivery.noticeVersion,
      isConsent: false,
    });
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    console.error("POST /api/candidate/safety/notice:", error);
    return NextResponse.json(
      { error: "Failed to record notice" },
      { status: 500 },
    );
  }
}
