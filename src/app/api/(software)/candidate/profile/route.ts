import { NextRequest, NextResponse } from "next/server";
import client, { DB_NAME, COLLECTIONS, matchId } from "@/lib/db";
import {
  candidateProfileUpdateSchema,
  candidateUpdateToMongo,
  formatCandidateProfileError,
  isCandidateProfileComplete,
  toCandidateProfileData,
  type CandidateProfileFields,
} from "@/lib/candidate/profile";
import { requireProfile } from "@/lib/api/session";
import { ensureIndexes } from "@/lib/db/indexes";

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

    const db = client.db(DB_NAME);
    const filter = { _id: matchId(auth.user.id) as never };
    const existing = await db.collection<UserDoc>(COLLECTIONS.USERS_COLLECTION).findOne(filter);

    const merged = toCandidateProfileData({
      ...existing,
      ...parsed.data,
      yearsExperience:
        parsed.data.yearsExperience === ""
          ? undefined
          : Number(parsed.data.yearsExperience),
      resumeSource: parsed.data.resumeSource || undefined,
      education: parsed.data.education,
      workExperience: parsed.data.workExperience,
      otherLinks: parsed.data.otherLinks,
      languages: parsed.data.languages,
      hobbies: parsed.data.hobbies,
      workAuthConfirmed: parsed.data.workAuthConfirmed,
      workAuthStayAgreed: parsed.data.workAuthStayAgreed,
    });
    const complete = isCandidateProfileComplete(merged);
    const { $set, $unset } = candidateUpdateToMongo(parsed.data, complete);

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
