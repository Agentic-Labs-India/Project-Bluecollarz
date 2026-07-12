import { NextRequest, NextResponse } from "next/server";
import client, { DB_NAME, COLLECTIONS, matchId } from "@/lib/db";
import {
  formatHireProfileError,
  hireProfileUpdateSchema,
  toHireProfileData,
  type HireCertificate,
  type HireProfileFields,
} from "@/lib/hire/profile";
import { requireProfile } from "@/lib/api/session";
import { ensureIndexes } from "@/lib/db/indexes";

type UserDoc = HireProfileFields & { _id: unknown };

/** Update the hiring fields on the signed-in hirer's user document. */
export async function PUT(req: NextRequest) {
  try {
    await ensureIndexes();
    const auth = await requireProfile("hire");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    if (!auth.user.id) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const parsed = hireProfileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatHireProfileError(parsed.error) },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const certificates: HireCertificate[] = data.certificates.map((cert) => ({
      id: cert.id,
      name: cert.name,
      ...(cert.issuer ? { issuer: cert.issuer } : {}),
      ...(cert.year !== undefined ? { year: cert.year } : {}),
    }));

    // Keep the user document tidy: set populated fields, unset emptied ones.
    const fields: Record<string, string> = {
      companyName: data.companyName,
      tagline: data.tagline,
      website: data.website,
      industry: data.industry,
      companySize: data.companySize,
      location: data.location,
      about: data.about,
    };
    const $set: Record<string, unknown> = { certificates };
    const $unset: Record<string, ""> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value) $set[key] = value;
      else $unset[key] = "";
    }

    const db = client.db(DB_NAME);
    const collection = db.collection<UserDoc>(COLLECTIONS.USERS_COLLECTION);
    const filter = { _id: matchId(auth.user.id) as never };

    await collection.updateOne(
      filter,
      Object.keys($unset).length ? { $set, $unset } : { $set },
    );

    const user = await collection.findOne(filter);
    return NextResponse.json({ profile: toHireProfileData(user) });
  } catch (error) {
    console.error("PUT /api/hire/profile:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
