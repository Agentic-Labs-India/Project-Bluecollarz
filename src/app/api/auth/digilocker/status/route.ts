import { type NextRequest, NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth/session";
import { formatDateOnly } from "@/lib/core/dates";
import client, { COLLECTIONS, DB_NAME, matchId } from "@/lib/db";
import { ensureIndexes } from "@/lib/db/indexes";
import { isIdentityVerified, type KycFields } from "@/lib/kyc";
import type {
  DigilockerKycView,
  DigilockerStatusResponse,
} from "@/lib/kyc/digilocker";

type UserDoc = KycFields & {
  name?: string | null;
  dateOfBirth?: Date | null;
  phoneNumber?: number | null;
  phoneCountryCode?: number | null;
  location?: string | null;
};

function phoneDisplay(doc: UserDoc): string | null {
  if (doc.phoneNumber == null) return null;
  const n = String(doc.phoneNumber);
  if (doc.phoneCountryCode != null) return `+${doc.phoneCountryCode} ${n}`;
  return n;
}

/** Durable KYC status from Mongo — no result cookie. */
export async function GET(req: NextRequest) {
  const auth = await requireProfile("work");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (!auth.user.id) {
    return NextResponse.json({ error: "Invalid user" }, { status: 400 });
  }

  try {
    const errorParam = req.nextUrl.searchParams.get("message");

    await ensureIndexes();
    const user = await client
      .db(DB_NAME)
      .collection<UserDoc>(COLLECTIONS.USERS_COLLECTION)
      .findOne(
        { _id: matchId(auth.user.id) as never },
        {
          projection: {
            isKycVerified: 1,
            kyc: 1,
            name: 1,
            dateOfBirth: 1,
            phoneNumber: 1,
            phoneCountryCode: 1,
            location: 1,
          },
        },
      );

    const isKycVerified = isIdentityVerified(user);
    const pack = user?.kyc ?? null;
    const verifiedAt =
      pack?.verifiedAt instanceof Date &&
      !Number.isNaN(pack.verifiedAt.getTime())
        ? pack.verifiedAt.toISOString()
        : null;

    let status: DigilockerStatusResponse["status"] = "idle";
    if (isKycVerified) status = "verified";
    else if (errorParam) status = "failed";

    const data: DigilockerKycView | null = isKycVerified
      ? {
          name: user?.name ?? null,
          dateOfBirth: user?.dateOfBirth
            ? formatDateOnly(user.dateOfBirth) || null
            : null,
          gender: pack?.gender ?? null,
          aadhaarLast4: pack?.aadhaarLast4 ?? null,
          pan: pack?.pan ?? null,
          phone: phoneDisplay(user ?? {}),
          address: user?.location ?? null,
          provider: pack?.provider ?? null,
        }
      : null;

    const body: DigilockerStatusResponse = {
      status,
      isKycVerified,
      error: errorParam,
      data,
      verifiedAt,
    };

    return NextResponse.json(body);
  } catch (error) {
    console.error("GET /api/auth/digilocker/status:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
