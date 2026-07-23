import { NextRequest, NextResponse } from "next/server";
import client, { DB_NAME, COLLECTIONS, matchId } from "@/lib/db";
import {
  candidateProfileUpdateSchema,
  candidateUpdateToMongo,
  formatCandidateProfileError,
  isCandidateProfileComplete,
  sanitizeGeoProfileFields,
  toCandidateProfileData,
  type CandidateProfileFields,
} from "@/lib/candidate/profile";
import { requireProfile } from "@/lib/api/session";
import { ensureIndexes } from "@/lib/db/indexes";
import { parseDateOnly } from "@/lib/dates";

type UserDoc = CandidateProfileFields & {
  _id: unknown;
  name?: string;
  email?: string;
  image?: string;
};

export async function GET() {
  // Auth must stay outside try/catch so prerender aborts aren't logged as 500s.
  const auth = await requireProfile("work");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    await ensureIndexes();
    const db = client.db(DB_NAME);
    const user = await db
      .collection<UserDoc>(COLLECTIONS.USERS_COLLECTION)
      .findOne({ _id: matchId(auth.user.id) as never });

    const profile = toCandidateProfileData(user);
    return NextResponse.json({
      profile,
      complete: isCandidateProfileComplete(profile),
    });
  } catch (error) {
    console.error("GET /api/candidate/profile:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await ensureIndexes();
    const auth = await requireProfile("work");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => null);
    const parsed = candidateProfileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatCandidateProfileError(parsed.error) },
        { status: 400 },
      );
    }

    const data = sanitizeGeoProfileFields(parsed.data);

    const db = client.db(DB_NAME);
    const filter = { _id: matchId(auth.user.id) as never };
    const existing = await db.collection<UserDoc>(COLLECTIONS.USERS_COLLECTION).findOne(filter);

    const merged = toCandidateProfileData({
      ...existing,
      ...data,
      yearsExperience: data.yearsExperience,
      fullTimeCompensation: data.fullTimeCompensation,
      partTimeCompensation: data.partTimeCompensation,
      dateOfBirth: parseDateOnly(data.dateOfBirth),
      resumeSource: data.resumeSource || undefined,
      education: data.education,
      workExperience: data.workExperience,
      otherLinks: data.otherLinks,
      languages: data.languages,
      voiceLanguage: data.voiceLanguage || undefined,
      hobbies: data.hobbies,
      workAuthConfirmed: data.workAuthConfirmed,
      workAuthStayAgreed: data.workAuthStayAgreed,
    });
    const complete = isCandidateProfileComplete(merged);
    const { $set, $unset } = candidateUpdateToMongo(data, complete);

    await db.collection(COLLECTIONS.USERS_COLLECTION).updateOne(
      filter,
      Object.keys($unset).length ? { $set, $unset } : { $set },
    );

    const user = await db.collection<UserDoc>(COLLECTIONS.USERS_COLLECTION).findOne(filter);
    const profile = toCandidateProfileData(user);
    return NextResponse.json({
      profile,
      complete: isCandidateProfileComplete(profile),
    });
  } catch (error) {
    console.error("PUT /api/candidate/profile:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
