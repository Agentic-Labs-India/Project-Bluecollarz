import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireProfile,
  rethrowIfPrerenderAbort,
} from "@/lib/api/session";
import { ensureIndexes } from "@/lib/db/indexes";
import {
  buildAccessExport,
  createRightsRequest,
  listRightsRequestsForUser,
  RIGHTS_ACKNOWLEDGE_HOURS,
  RIGHTS_REQUEST_TYPES,
  RIGHTS_RESOLVE_DAYS,
  serializeRightsRequest,
} from "@/lib/compliance/rights";
import {
  appendConsentEvent,
  CONSENT_PURPOSES,
  getActivePurposes,
} from "@/lib/compliance/consent";
import { formatZodError } from "@/lib/utils";

const createSchema = z.object({
  type: z.enum(RIGHTS_REQUEST_TYPES),
  details: z.string().trim().min(3).max(4000),
  nomineeName: z.string().trim().max(120).optional(),
  nomineeEmail: z.string().trim().email().optional().or(z.literal("")),
});

/** List the signed-in worker's rights requests. */
export async function GET(req: NextRequest) {
  try {
    await ensureIndexes();
    const auth = await requireProfile("work");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (req.nextUrl.searchParams.get("export") === "1") {
      const pack = await buildAccessExport(auth.user.id);
      return NextResponse.json(pack);
    }

    const items = await listRightsRequestsForUser(auth.user.id);
    return NextResponse.json({
      items: items.map((item) => serializeRightsRequest(item)),
      timelines: {
        acknowledgeHours: RIGHTS_ACKNOWLEDGE_HOURS,
        resolveDays: RIGHTS_RESOLVE_DAYS,
        provisional: true,
      },
    });
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    console.error("GET /api/candidate/rights:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/** Open a Data Principal rights request. */
export async function POST(req: NextRequest) {
  try {
    await ensureIndexes();
    const auth = await requireProfile("work");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }

    if (parsed.data.type === "nominate") {
      if (!parsed.data.nomineeName?.trim() || !parsed.data.nomineeEmail?.trim()) {
        return NextResponse.json(
          { error: "Nominee name and email are required" },
          { status: 400 },
        );
      }
    }

    const doc = await createRightsRequest({
      dataPrincipalId: auth.user.id,
      email: auth.user.email,
      type: parsed.data.type,
      details: parsed.data.details,
      nomineeName: parsed.data.nomineeName,
      nomineeEmail: parsed.data.nomineeEmail || undefined,
    });

    if (parsed.data.type === "withdraw") {
      const active = await getActivePurposes(auth.user.id);
      const purposes =
        active.purposes.length > 0 ? active.purposes : [...CONSENT_PURPOSES];
      await appendConsentEvent({
        dataPrincipalId: auth.user.id,
        purposes,
        status: "withdrawn",
        method: "settings",
      });
    }

    // Access requests can return the package immediately as acknowledgment.
    let exportPack = null;
    if (parsed.data.type === "access") {
      exportPack = await buildAccessExport(auth.user.id);
    }

    return NextResponse.json({
      item: serializeRightsRequest(doc),
      export: exportPack,
      ...(parsed.data.type === "withdraw"
        ? {
            message:
              "Consent withdrawn. DigiLocker and employer assurance release are blocked until you grant again.",
          }
        : {}),
    });
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    console.error("POST /api/candidate/rights:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
