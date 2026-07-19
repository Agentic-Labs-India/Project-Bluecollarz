import { NextResponse } from "next/server";
import client, { DB_NAME, COLLECTIONS, matchId } from "@/lib/db";
import { ensureIndexes } from "@/lib/db/indexes";
import { requireProfile } from "@/lib/api/session";
import { toKycPublicState, type KycFields } from "@/lib/kyc";

/** Candidate KYC status (identity verification). */
export async function GET() {
  // Auth must stay outside try/catch so prerender aborts aren't logged as 500s.
  const auth = await requireProfile("work");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (!auth.user.id) {
    return NextResponse.json({ error: "Invalid user" }, { status: 400 });
  }

  try {
    await ensureIndexes();
    const user = await client
      .db(DB_NAME)
      .collection<KycFields>(COLLECTIONS.USERS_COLLECTION)
      .findOne(
        { _id: matchId(auth.user.id) as never },
        {
          projection: {
            kycStatus: 1,
            kycDocuments: 1,
            kycAnalysis: 1,
            kycDeferred: 1,
            kycVerifiedAt: 1,
            kycUpdatedAt: 1,
          },
        },
      );

    return NextResponse.json({
      userId: auth.user.id,
      kyc: toKycPublicState(user),
    });
  } catch (error) {
    console.error("GET /api/candidate/kyc:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
