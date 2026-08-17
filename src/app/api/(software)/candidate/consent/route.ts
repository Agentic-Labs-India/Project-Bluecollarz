import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, rethrowIfPrerenderAbort } from "@/lib/auth/session";
import {
  appendConsentEvent,
  CONSENT_NOTICE_VERSION,
  CONSENT_PURPOSES,
  DIGILOCKER_REQUIRED_PURPOSES,
  getActivePurposes,
  isConsentPurpose,
} from "@/lib/compliance/consent";
import {
  consumeConsentPlayback,
  playbackMatchesGrant,
} from "@/lib/compliance/consent-playback";
import { ensureIndexes } from "@/lib/db/indexes";
import { cancelScheduledMedicalOnWithdrawal } from "@/lib/medical/appointments";
import { formatZodError } from "@/lib/utils";

const grantSchema = z.object({
  action: z.literal("grant"),
  playbackId: z.string().trim().min(1),
  purposes: z
    .array(z.string())
    .min(1)
    .transform((values, ctx) => {
      const purposes = values.filter(isConsentPurpose);
      if (!purposes.length) {
        ctx.addIssue({
          code: "custom",
          message: "Select at least one valid purpose",
        });
        return z.NEVER;
      }
      return purposes;
    }),
});

const withdrawSchema = z.object({
  action: z.literal("withdraw"),
  purposes: z
    .array(z.string())
    .min(1)
    .transform((values, ctx) => {
      const purposes = values.filter(isConsentPurpose);
      if (!purposes.length) {
        ctx.addIssue({
          code: "custom",
          message: "Select at least one valid purpose",
        });
        return z.NEVER;
      }
      return purposes;
    }),
  method: z.enum(["voice_tap", "web_tap", "settings"]).optional(),
});

const bodySchema = z.discriminatedUnion("action", [
  grantSchema,
  withdrawSchema,
]);

/** Current consent snapshot for the signed-in worker. */
export async function GET() {
  try {
    await ensureIndexes();
    const auth = await requireProfile("work");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const active = await getActivePurposes(auth.user.id);
    return NextResponse.json({
      noticeVersion: CONSENT_NOTICE_VERSION,
      availablePurposes: CONSENT_PURPOSES,
      // The identity gate must not demand unrelated purposes such as medical.
      digilockerPurposes: DIGILOCKER_REQUIRED_PURPOSES,
      active,
    });
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    console.error("GET /api/candidate/consent:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

/** Append grant or withdrawal (immutable). */
export async function POST(req: NextRequest) {
  try {
    await ensureIndexes();
    const auth = await requireProfile("work");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }

    if (parsed.data.action === "grant") {
      const playback = await consumeConsentPlayback({
        userId: auth.user.id,
        playbackId: parsed.data.playbackId,
      });
      if (!playback) {
        return NextResponse.json(
          {
            error:
              "Play the notice first. Agreement is recorded only after this device requested the official wording from us.",
          },
          { status: 400 },
        );
      }
      if (!playbackMatchesGrant(playback.scope, parsed.data.purposes)) {
        return NextResponse.json(
          {
            error:
              "That playback does not cover these purposes. Play the matching notice and try again.",
          },
          { status: 400 },
        );
      }
    }

    const event = await appendConsentEvent({
      dataPrincipalId: auth.user.id,
      purposes: parsed.data.purposes,
      status: parsed.data.action === "grant" ? "granted" : "withdrawn",
      method:
        parsed.data.action === "grant"
          ? "voice_tap"
          : (parsed.data.method ?? "web_tap"),
    });

    if (
      parsed.data.action === "withdraw" &&
      parsed.data.purposes.includes("medical")
    ) {
      await cancelScheduledMedicalOnWithdrawal(auth.user.id);
    }

    const active = await getActivePurposes(auth.user.id);
    return NextResponse.json({
      event: {
        consentId: event.consentId,
        purposes: event.purposes,
        noticeVersion: event.noticeVersion,
        timestamp: event.timestamp.toISOString(),
        method: event.method,
        status: event.status,
      },
      active,
    });
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    console.error("POST /api/candidate/consent:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
