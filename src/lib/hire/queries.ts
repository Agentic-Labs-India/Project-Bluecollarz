import client, { DB_NAME, COLLECTIONS, matchId, matchIds } from "@/lib/db";
import type { JobDocument } from "@/lib/jobs";
import type { ApplicationDocument } from "@/lib/jobs/applications";
import type { HireActiveRole, HireOverview } from "@/lib/hire";
import {
  isHireProfileComplete,
  toHireProfileData,
  type HireProfileFields,
} from "@/lib/hire/profile";
import { asNumber, idHex } from "@/lib/utils";
import { ensureIndexes } from "@/lib/db/indexes";

type HireUserDoc = HireProfileFields & {
  _id: unknown;
  name?: string;
  email?: string;
  image?: string;
  phoneNumber?: string;
  createdAt?: Date;
};

/** Lightweight check — whether the hirer's company profile is complete enough to post roles. */
export async function getHireProfileComplete(userId: string): Promise<boolean> {
  await ensureIndexes();
  if (!userId) return false;
  const user = await client
    .db(DB_NAME)
    .collection<HireUserDoc>(COLLECTIONS.USERS_COLLECTION)
    .findOne({ _id: matchId(userId) as never });
  return isHireProfileComplete(toHireProfileData(user));
}
export async function getHireOverview(viewer: {
  id: string;
  email: string;
}): Promise<HireOverview> {
  await ensureIndexes();
  const db = client.db(DB_NAME);
  const ownerMatch = viewer.id ? matchId(viewer.id) : null;

  const [jobs, account] = await Promise.all([
    ownerMatch
      ? db
          .collection<JobDocument>(COLLECTIONS.JOBS)
          .find({ ownerId: ownerMatch })
          .sort({ publishedAt: -1, createdAt: -1 })
          .toArray()
      : Promise.resolve([] as JobDocument[]),
    ownerMatch
      ? db
          .collection<HireUserDoc>(COLLECTIONS.USERS_COLLECTION)
          .findOne({ _id: ownerMatch as never })
      : Promise.resolve(null),
  ]);

  const roles = {
    total: jobs.length,
    draft: jobs.filter((job) => job.status === "draft").length,
    published: jobs.filter((job) => job.status === "published").length,
    closed: jobs.filter((job) => job.status === "closed").length,
  };

  const jobIdHexes = jobs.map((job) => idHex(job._id)).filter(Boolean);

  const grouped = jobIdHexes.length
    ? await db
        .collection<ApplicationDocument>(COLLECTIONS.APPLICATIONS)
        .aggregate<{ _id: unknown; total: number; selected: number; applied: number }>([
          { $match: { jobId: { $in: matchIds(jobIdHexes) } } },
          {
            $group: {
              _id: "$jobId",
              total: { $sum: 1 },
              selected: {
                $sum: { $cond: [{ $eq: ["$status", "selected"] }, 1, 0] },
              },
              applied: {
                $sum: { $cond: [{ $eq: ["$status", "applied"] }, 1, 0] },
              },
            },
          },
        ])
        .toArray()
    : [];

  const countsByJob = new Map(grouped.map((row) => [idHex(row._id), row]));

  let totalApplicants = 0;
  let selectedApplicants = 0;
  let activeApplicants = 0;
  for (const job of jobs) {
    const row = countsByJob.get(idHex(job._id));
    if (!row) continue;
    totalApplicants += row.total;
    selectedApplicants += row.selected;
    if (job.status === "published") activeApplicants += row.applied;
  }

  const activeRoles: HireActiveRole[] = jobs
    .filter((job) => job.status === "published")
    .slice(0, 5)
    .map((job) => ({
      id: idHex(job._id),
      title: job.title,
      pay: job.pay,
      status: job.status,
      applicants: countsByJob.get(idHex(job._id))?.total ?? 0,
      publishedAt: job.publishedAt?.toISOString() ?? null,
    }));

  const hiresThisMonth = jobs.reduce(
    (sum, job) => sum + asNumber(job.hiredThisMonth, 0),
    0,
  );

  return {
    account: {
      name: account?.name ?? null,
      email: account?.email ?? viewer.email,
      phoneNumber: account?.phoneNumber ?? null,
      image: account?.image ?? null,
      memberSince: account?.createdAt?.toISOString() ?? null,
    },
    roles,
    applicants: {
      total: totalApplicants,
      active: activeApplicants,
      selected: selectedApplicants,
    },
    hiresThisMonth,
    activeRoles,
    profile: toHireProfileData(account),
  };
}
