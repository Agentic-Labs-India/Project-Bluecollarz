import "server-only";

import { ObjectId } from "mongodb";
import type { ActorRef } from "@/lib/auth/session";
import { isMedicalReportUrl } from "@/lib/blob/pathname";
import {
  hasGrantedPurposes,
  MEDICAL_REQUIRED_PURPOSES,
} from "@/lib/compliance/consent";
import client, {
  COLLECTIONS,
  DB_NAME,
  isId,
  matchId,
  matchIds,
} from "@/lib/db";
import { ensureIndexes } from "@/lib/db/indexes";
import type { JobDocument } from "@/lib/jobs";
import type { ApplicationDocument } from "@/lib/jobs/applications";
import {
  getMedicalCenter,
  getMedicalCentersByIds,
  listMedicalCenters,
} from "@/lib/medical/centers";
import {
  availableSlotTimes,
  isOperatingDay,
  medicalDayRangeUtc,
  medicalOptionalDateSpanUtc,
  medicalWallToUtc,
  utcToMedicalParts,
} from "@/lib/medical/time";
import {
  type CandidateMedicalAppointment,
  type CandidateMedicalReport,
  type CandidateMedicalScheduleContext,
  type CandidateScheduleInput,
  type CompleteMedicalInput,
  type MedicalAppointmentListItem,
  type MedicalAppointmentStatus,
  type MedicalCenterListItem,
  MedicalError,
  type MedicalPipelineStatus,
  type MedicalQueueItem,
  type MedicalQueueQuery,
  type MedicalReport,
  medicalDirectionsUrl,
  medicalPipelineFromAppointment,
  medicalPlaceLabel,
  type PatchAppointmentInput,
  type ScheduleAppointmentInput,
  toPublicMedicalCenter,
} from "@/lib/medical/types";
import { idHex } from "@/lib/utils";

type MedicalReportRecord = {
  id: string;
  name: string;
  url: string;
  contentType: string;
  uploadedAt: Date;
};

type MedicalAppointmentDocument = {
  _id: unknown;
  applicationId: string;
  applicantId: string;
  jobId: string;
  centerId: string;
  scheduledAt: Date;
  status: MedicalAppointmentStatus;
  notes: string | null;
  reports?: MedicalReportRecord[];
  assignedById: string;
  createdAt: Date;
  updatedAt: Date;
};

type UserLite = {
  _id: unknown;
  name?: string | null;
};

/**
 * Health data may only be processed while the candidate's `medical` consent is
 * live. Checked at booking and again at report upload, because consent can be
 * withdrawn in between.
 */
async function assertMedicalConsent(applicantId: string): Promise<void> {
  const granted = await hasGrantedPurposes(
    applicantId,
    MEDICAL_REQUIRED_PURPOSES,
  );
  if (!granted) {
    throw new MedicalError(
      "This candidate has not consented to medical fitness processing.",
      403,
      "MEDICAL_CONSENT_REQUIRED",
    );
  }
}

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}

function appointments() {
  return client
    .db(DB_NAME)
    .collection<MedicalAppointmentDocument>(COLLECTIONS.MEDICAL_APPOINTMENTS);
}

function applications() {
  return client
    .db(DB_NAME)
    .collection<ApplicationDocument>(COLLECTIONS.APPLICATIONS);
}

function jobs() {
  return client.db(DB_NAME).collection<JobDocument>(COLLECTIONS.JOBS);
}

function users() {
  return client.db(DB_NAME).collection<UserLite>(COLLECTIONS.USERS_COLLECTION);
}

function serializeReports(reports: unknown): MedicalReport[] {
  if (!Array.isArray(reports)) return [];
  const out: MedicalReport[] = [];
  for (const raw of reports) {
    if (!raw || typeof raw !== "object") continue;
    const report = raw as {
      id?: unknown;
      name?: unknown;
      url?: unknown;
      contentType?: unknown;
      uploadedAt?: unknown;
    };
    if (typeof report.id !== "string" || typeof report.url !== "string") {
      continue;
    }
    const uploadedAt =
      report.uploadedAt instanceof Date
        ? report.uploadedAt
        : typeof report.uploadedAt === "string"
          ? new Date(report.uploadedAt)
          : new Date();
    out.push({
      id: report.id,
      name: typeof report.name === "string" ? report.name : "Report",
      url: report.url,
      contentType:
        typeof report.contentType === "string"
          ? report.contentType
          : "application/pdf",
      uploadedAt: uploadedAt.toISOString(),
    });
  }
  return out;
}

function toListItem(
  doc: MedicalAppointmentDocument,
  extras: {
    applicantName: string | null;
    jobTitle: string;
    centerName: string;
    centerAddress: string;
    centerCity: string;
    centerPlaceLabel: string;
    directionsUrl: string;
  },
): MedicalAppointmentListItem {
  return {
    id: idHex(doc._id),
    applicationId: doc.applicationId,
    applicantId: doc.applicantId,
    applicantName: extras.applicantName,
    jobId: doc.jobId,
    jobTitle: extras.jobTitle,
    centerId: doc.centerId,
    centerName: extras.centerName,
    centerAddress: extras.centerAddress,
    centerCity: extras.centerCity,
    centerPlaceLabel: extras.centerPlaceLabel,
    directionsUrl: extras.directionsUrl,
    scheduledAt: doc.scheduledAt.toISOString(),
    status: doc.status,
    notes: doc.notes,
    reports: serializeReports(doc.reports),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

async function hydrateAppointments(
  docs: MedicalAppointmentDocument[],
): Promise<MedicalAppointmentListItem[]> {
  if (!docs.length) return [];
  const applicantIds = [
    ...new Set(docs.map((d) => d.applicantId).filter(isId)),
  ];
  const jobIds = [...new Set(docs.map((d) => d.jobId).filter(isId))];
  const centerIds = [...new Set(docs.map((d) => d.centerId).filter(isId))];

  const [userDocs, jobDocs, centers] = await Promise.all([
    applicantIds.length
      ? users()
          .find({ _id: { $in: matchIds(applicantIds) } as never })
          .project({ name: 1 })
          .toArray()
      : Promise.resolve([]),
    jobIds.length
      ? jobs()
          .find({ _id: { $in: matchIds(jobIds) } as never })
          .project({ title: 1 })
          .toArray()
      : Promise.resolve([]),
    getMedicalCentersByIds(centerIds),
  ]);

  const userById = new Map(
    userDocs.map((user) => [
      idHex(user._id),
      {
        name: user.name?.trim() || null,
      },
    ]),
  );
  const jobById = new Map(
    jobDocs.map((job) => [idHex(job._id), job.title || "Role"]),
  );

  return docs.map((doc) => {
    const user = userById.get(doc.applicantId);
    const center = centers.get(doc.centerId);
    return toListItem(doc, {
      applicantName: user?.name ?? null,
      jobTitle: jobById.get(doc.jobId) ?? "Role",
      centerName: center?.name ?? "Medical center",
      centerAddress: center?.address ?? "",
      centerCity: center?.city ?? "",
      centerPlaceLabel: center?.placeLabel ?? medicalPlaceLabel({}),
      directionsUrl:
        center?.directionsUrl ??
        medicalDirectionsUrl({
          address: center?.address,
          city: center?.city,
          countryCode: center?.countryCode,
          stateCode: center?.stateCode,
        }),
    });
  });
}

async function assertSlotFree(
  centerId: string,
  scheduledAt: Date,
  excludeId?: string,
) {
  const filter: Record<string, unknown> = {
    centerId,
    scheduledAt,
    status: "scheduled",
  };
  if (excludeId && isId(excludeId)) {
    filter._id = { $ne: new ObjectId(excludeId) };
  }
  const taken = await appointments().findOne(filter);
  if (taken) {
    throw new MedicalError(
      "That date and time is already booked at this center",
      409,
    );
  }
}

function resolveScheduleInstant(
  date: string,
  time: string,
  center: MedicalCenterListItem,
): Date {
  if (!isOperatingDay(date, center.hours.days)) {
    throw new MedicalError("This center is closed on that day");
  }
  const slots = availableSlotTimes({
    date,
    hours: center.hours,
  });
  if (!slots.includes(time)) {
    throw new MedicalError(
      "That time is outside this center's operating hours",
    );
  }
  return medicalWallToUtc(date, time);
}

export async function listTakenSlotTimes(opts: {
  centerId: string;
  date: string;
  excludeAppointmentId?: string;
}): Promise<string[]> {
  if (!isId(opts.centerId)) return [];
  const { from, to } = medicalDayRangeUtc(opts.date);
  const filter: Record<string, unknown> = {
    centerId: opts.centerId,
    status: "scheduled",
    scheduledAt: { $gte: from, $lt: to },
  };
  if (opts.excludeAppointmentId && isId(opts.excludeAppointmentId)) {
    filter._id = { $ne: new ObjectId(opts.excludeAppointmentId) };
  }
  const docs = await appointments()
    .find(filter)
    .project({ scheduledAt: 1 })
    .toArray();
  return docs.map((doc) => utcToMedicalParts(doc.scheduledAt).time);
}

export async function listAvailableSlotTimes(opts: {
  centerId: string;
  date: string;
  excludeAppointmentId?: string;
  excludeApplicantId?: string;
  excludeJobId?: string;
}): Promise<string[]> {
  const center = await getMedicalCenter(opts.centerId);
  if (!center || !center.active) return [];
  const excludeAppointmentId =
    opts.excludeAppointmentId ??
    (opts.excludeApplicantId && opts.excludeJobId
      ? await scheduledAppointmentIdForJob(
          opts.excludeApplicantId,
          opts.excludeJobId,
        )
      : undefined);
  const taken = await listTakenSlotTimes({
    centerId: opts.centerId,
    date: opts.date,
    excludeAppointmentId,
  });
  return availableSlotTimes({
    date: opts.date,
    hours: center.hours,
    taken,
  });
}

async function scheduledAppointmentIdForJob(
  applicantId: string,
  jobId: string,
): Promise<string | undefined> {
  if (!isId(applicantId) || !isId(jobId)) return undefined;
  const doc = await appointments()
    .find({
      applicantId: matchId(applicantId) as never,
      jobId,
      status: "scheduled",
    })
    .project({ _id: 1 })
    .limit(1)
    .next();
  return doc ? idHex(doc._id) : undefined;
}

function appointmentScheduledAtFilter(
  from?: string,
  to?: string,
): { $gte?: Date; $lt?: Date } | null {
  const span = medicalOptionalDateSpanUtc(from, to);
  if (!span) return null;
  const scheduledAt: { $gte?: Date; $lt?: Date } = {};
  if (span.from) scheduledAt.$gte = span.from;
  if (span.to) scheduledAt.$lt = span.to;
  return scheduledAt;
}

function selectedAtIso(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

async function queueItemsFromApps(
  apps: ApplicationDocument[],
  appointmentDocs: MedicalAppointmentDocument[],
): Promise<MedicalQueueItem[]> {
  if (!apps.length) return [];

  const bookedIds = new Set(appointmentDocs.map((doc) => doc.applicationId));
  const missing = apps.filter((app) => !bookedIds.has(idHex(app._id)));
  const missingApplicantIds = [
    ...new Set(missing.map((app) => idHex(app.applicantId)).filter(isId)),
  ];
  const missingJobIds = [
    ...new Set(missing.map((app) => idHex(app.jobId)).filter(isId)),
  ];

  const [hydrated, userDocs, jobDocs] = await Promise.all([
    hydrateAppointments(appointmentDocs),
    missingApplicantIds.length
      ? users()
          .find({ _id: { $in: matchIds(missingApplicantIds) } as never })
          .project({ name: 1 })
          .toArray()
      : Promise.resolve([]),
    missingJobIds.length
      ? jobs()
          .find({ _id: { $in: matchIds(missingJobIds) } as never })
          .project({ title: 1 })
          .toArray()
      : Promise.resolve([]),
  ]);

  const appointmentByApp = new Map(
    hydrated.map((item) => [item.applicationId, item]),
  );
  const userById = new Map(
    userDocs.map((user) => [
      idHex(user._id),
      {
        name: user.name?.trim() || null,
      },
    ]),
  );
  const jobById = new Map(
    jobDocs.map((job) => [idHex(job._id), job.title || "Role"]),
  );

  return apps.map((app) => {
    const applicationId = idHex(app._id);
    const applicantId = idHex(app.applicantId);
    const jobId = idHex(app.jobId);
    const appointment = appointmentByApp.get(applicationId) ?? null;
    const user = userById.get(applicantId);
    return {
      applicationId,
      applicantId,
      applicantName: appointment?.applicantName ?? user?.name ?? null,
      jobId,
      jobTitle: appointment?.jobTitle ?? jobById.get(jobId) ?? "Role",
      selectedAt: selectedAtIso(app.createdAt),
      appointment,
    };
  });
}

export async function listSelectedMedicalQueue(
  filter: MedicalQueueQuery = {},
): Promise<MedicalQueueItem[]> {
  await ensureIndexes();

  const scheduledAt = appointmentScheduledAtFilter(filter.from, filter.to);
  const appointmentStatus =
    filter.status && filter.status !== "unscheduled"
      ? filter.status
      : undefined;

  if (filter.status === "unscheduled" && (scheduledAt || filter.centerId)) {
    return [];
  }

  if (scheduledAt || appointmentStatus || filter.centerId) {
    const query: Record<string, unknown> = {};
    if (appointmentStatus) query.status = appointmentStatus;
    if (scheduledAt) query.scheduledAt = scheduledAt;
    if (filter.centerId) query.centerId = filter.centerId;
    const appointmentDocs = await appointments().find(query).toArray();
    if (!appointmentDocs.length) return [];

    const applicationIds = [
      ...new Set(appointmentDocs.map((doc) => doc.applicationId).filter(isId)),
    ];
    const apps = await applications()
      .find({
        _id: { $in: matchIds(applicationIds) } as never,
        status: "selected",
      })
      .sort({ createdAt: -1 })
      .toArray();
    if (!apps.length) return [];

    const selectedIds = new Set(apps.map((app) => idHex(app._id)));
    return queueItemsFromApps(
      apps,
      appointmentDocs.filter((doc) => selectedIds.has(doc.applicationId)),
    );
  }

  const apps = await applications()
    .find({ status: "selected" })
    .sort({ createdAt: -1 })
    .toArray();
  if (!apps.length) return [];

  const applicationIds = apps.map((app) => idHex(app._id)).filter(Boolean);
  const appointmentQuery: Record<string, unknown> = {
    applicationId: { $in: applicationIds },
  };

  if (filter.status === "unscheduled") {
    const booked = await appointments()
      .find(appointmentQuery)
      .project({ applicationId: 1 })
      .toArray();
    const bookedIds = new Set(booked.map((doc) => doc.applicationId));
    return queueItemsFromApps(
      apps.filter((app) => !bookedIds.has(idHex(app._id))),
      [],
    );
  }

  const appointmentDocs = await appointments().find(appointmentQuery).toArray();
  return queueItemsFromApps(apps, appointmentDocs);
}

export async function scheduleMedicalAppointment(
  input: ScheduleAppointmentInput,
  actor: ActorRef,
): Promise<MedicalAppointmentListItem> {
  await ensureIndexes();
  if (!isId(input.applicationId) || !isId(input.centerId)) {
    throw new MedicalError("Invalid id");
  }

  const app = await applications().findOne({
    _id: matchId(input.applicationId) as never,
  });
  if (!app) throw new MedicalError("Application not found", 404);
  if (app.status !== "selected") {
    throw new MedicalError("Only selected candidates can be scheduled");
  }

  await assertMedicalConsent(idHex(app.applicantId));

  const center = await getMedicalCenter(input.centerId);
  if (!center) throw new MedicalError("Medical center not found", 404);
  if (!center.active) {
    throw new MedicalError("This medical center is inactive");
  }

  const scheduledAt = resolveScheduleInstant(input.date, input.time, center);
  const applicationId = idHex(app._id);
  const existing = await appointments().findOne({ applicationId });
  if (existing?.status === "completed") {
    throw new MedicalError("Medical test already completed", 409);
  }
  if (existing?.status === "no_show" || existing?.status === "unfit") {
    throw new MedicalError("This medical test is closed", 409);
  }

  await assertSlotFree(
    input.centerId,
    scheduledAt,
    existing ? idHex(existing._id) : undefined,
  );

  const now = new Date();
  const fields = {
    applicationId,
    applicantId: idHex(app.applicantId),
    jobId: idHex(app.jobId),
    centerId: input.centerId,
    scheduledAt,
    status: "scheduled" as const,
    notes: input.notes?.trim() || null,
    assignedById: actor.id,
    updatedAt: now,
  };

  let doc: MedicalAppointmentDocument | null;
  try {
    if (existing) {
      doc = await appointments().findOneAndUpdate(
        { _id: existing._id as never },
        { $set: fields },
        { returnDocument: "after" },
      );
    } else {
      const inserted = await appointments().insertOne({
        ...fields,
        createdAt: now,
      } as never);
      doc = await appointments().findOne({ _id: inserted.insertedId });
    }
  } catch (error) {
    if (isDuplicateKey(error)) {
      throw new MedicalError(
        "That date and time is already booked at this center",
        409,
      );
    }
    throw error;
  }
  if (!doc) throw new MedicalError("Could not save appointment", 500);
  const [item] = await hydrateAppointments([doc]);
  return item;
}

export async function patchMedicalAppointment(
  input: PatchAppointmentInput,
  actor: ActorRef,
): Promise<MedicalAppointmentListItem> {
  await ensureIndexes();
  if (!isId(input.id)) throw new MedicalError("Invalid id");

  const existing = await appointments().findOne({
    _id: matchId(input.id) as never,
  });
  if (!existing) throw new MedicalError("Appointment not found", 404);

  const nextStatus = input.status ?? existing.status;
  const $set: Partial<MedicalAppointmentDocument> = {
    updatedAt: new Date(),
    assignedById: actor.id,
  };

  if (input.notes !== undefined) $set.notes = input.notes.trim() || null;
  if (input.status) $set.status = input.status;

  const rescheduling =
    nextStatus === "scheduled" &&
    (Boolean(input.centerId) || Boolean(input.date) || Boolean(input.time));

  if (rescheduling) {
    if (
      existing.status === "completed" ||
      existing.status === "no_show" ||
      existing.status === "unfit"
    ) {
      throw new MedicalError("This medical test cannot be rescheduled", 409);
    }
    const centerId = input.centerId ?? existing.centerId;
    const current = utcToMedicalParts(existing.scheduledAt);
    const date = input.date ?? current.date;
    const time = input.time ?? current.time;
    const center = await getMedicalCenter(centerId);
    if (!center) throw new MedicalError("Medical center not found", 404);
    if (!center.active)
      throw new MedicalError("This medical center is inactive");
    const scheduledAt = resolveScheduleInstant(date, time, center);
    await assertSlotFree(centerId, scheduledAt, idHex(existing._id));
    $set.centerId = centerId;
    $set.scheduledAt = scheduledAt;
    $set.status = "scheduled";
  }

  let updated: MedicalAppointmentDocument | null;
  try {
    updated = await appointments().findOneAndUpdate(
      { _id: existing._id as never },
      { $set },
      { returnDocument: "after" },
    );
  } catch (error) {
    if (isDuplicateKey(error)) {
      throw new MedicalError(
        "That date and time is already booked at this center",
        409,
      );
    }
    throw error;
  }
  if (!updated) throw new MedicalError("Appointment not found", 404);
  const [item] = await hydrateAppointments([updated]);
  return item;
}

export async function getMedicalStatusByApplicationIds(
  applicationIds: string[],
): Promise<Map<string, MedicalPipelineStatus>> {
  const unique = [...new Set(applicationIds.filter(Boolean))];
  if (!unique.length) return new Map();
  const docs = await appointments()
    .find({ applicationId: { $in: unique } })
    .project({ applicationId: 1, status: 1 })
    .toArray();
  const map = new Map<string, MedicalPipelineStatus>();
  for (const doc of docs) {
    map.set(doc.applicationId, medicalPipelineFromAppointment(doc.status));
  }
  return map;
}

export async function listCandidateMedicalAppointments(
  userId: string,
  jobId?: string,
  allStatuses = Boolean(jobId),
): Promise<CandidateMedicalAppointment[]> {
  await ensureIndexes();
  if (!userId) return [];
  const filter: Record<string, unknown> = {
    applicantId: matchId(userId),
  };
  if (jobId) {
    if (!isId(jobId)) return [];
    filter.jobId = jobId;
  } else if (!allStatuses) {
    filter.status = "scheduled";
  }
  const docs = await appointments()
    .find(filter)
    .sort({ scheduledAt: 1 })
    .toArray();
  if (!docs.length) return [];
  const items = await hydrateAppointments(docs);
  return items.map((item) => ({
    id: item.id,
    applicationId: item.applicationId,
    jobId: item.jobId,
    jobTitle: item.jobTitle,
    scheduledAt: item.scheduledAt,
    status: item.status,
    center: {
      id: item.centerId,
      name: item.centerName,
      address: item.centerAddress,
      city: item.centerCity,
      placeLabel: item.centerPlaceLabel,
      directionsUrl: item.directionsUrl,
    },
  }));
}

export async function getCandidateScheduleContext(
  userId: string,
  jobId?: string,
): Promise<CandidateMedicalScheduleContext | null> {
  await ensureIndexes();
  if (!userId) return null;
  const apps = await applications()
    .find({ applicantId: matchId(userId), status: "selected" })
    .sort({ createdAt: -1 })
    .toArray();
  if (!apps.length) return null;

  const requested = jobId
    ? apps.find((app) => idHex(app.jobId) === jobId)
    : undefined;
  if (jobId && !requested) return null;

  const booked = await listCandidateMedicalAppointments(userId, jobId, true);
  const bookedByJob = new Map(booked.map((item) => [item.jobId, item]));
  const app =
    requested ??
    apps.find((item) => !bookedByJob.has(idHex(item.jobId))) ??
    apps[0];
  const selectedJobId = idHex(app.jobId);
  const appointment = bookedByJob.get(selectedJobId) ?? null;
  const closed =
    appointment?.status === "completed" ||
    appointment?.status === "no_show" ||
    appointment?.status === "unfit";

  const [centers, job, medicalConsent] = await Promise.all([
    closed
      ? Promise.resolve([])
      : listMedicalCenters({ active: true }).then((items) =>
          items.map(toPublicMedicalCenter),
        ),
    jobs()
      .find({ _id: matchId(selectedJobId) as never })
      .project({ title: 1 })
      .limit(1)
      .next(),
    hasGrantedPurposes(userId, MEDICAL_REQUIRED_PURPOSES),
  ]);

  return {
    jobId: selectedJobId,
    jobTitle: job?.title ?? "Role",
    applicationId: idHex(app._id),
    appointment,
    centers,
    medicalConsent,
  };
}

export async function scheduleCandidateMedicalAppointment(
  userId: string,
  input: CandidateScheduleInput,
  actor: ActorRef,
): Promise<MedicalAppointmentListItem> {
  const app = await applications().findOne({
    applicantId: matchId(userId) as never,
    jobId: matchId(input.jobId) as never,
    status: "selected",
  });
  if (!app) {
    throw new MedicalError("Selected application not found", 404);
  }
  return scheduleMedicalAppointment(
    {
      applicationId: idHex(app._id),
      centerId: input.centerId,
      date: input.date,
      time: input.time,
      notes: undefined,
    },
    actor,
  );
}

const MAX_REPORTS = 10;

export async function completeMedicalAppointment(
  input: CompleteMedicalInput,
  actor: ActorRef,
): Promise<MedicalAppointmentListItem> {
  await ensureIndexes();
  if (!isId(input.appointmentId)) throw new MedicalError("Invalid id");
  if (!input.reports.length) {
    throw new MedicalError("Attach at least one medical report");
  }
  if (input.reports.length > MAX_REPORTS) {
    throw new MedicalError("Maximum of 10 reports per appointment", 409);
  }

  const existing = await appointments().findOne({
    _id: matchId(input.appointmentId) as never,
  });
  if (!existing) throw new MedicalError("Appointment not found", 404);
  if (existing.status === "completed") {
    throw new MedicalError("Medical test already completed", 409);
  }
  if (existing.status !== "scheduled") {
    throw new MedicalError("Only scheduled appointments can be completed");
  }

  await assertMedicalConsent(existing.applicantId);

  const now = new Date();
  const reports: MedicalReportRecord[] = input.reports.map((file) => {
    if (!isMedicalReportUrl(file.url, input.appointmentId)) {
      throw new MedicalError("Invalid report file");
    }
    return {
      id: crypto.randomUUID(),
      name: file.name,
      url: file.url,
      contentType: file.contentType,
      uploadedAt: now,
    };
  });

  const updated = await appointments().findOneAndUpdate(
    { _id: existing._id as never, status: "scheduled" },
    {
      $set: {
        status: "completed",
        reports,
        assignedById: actor.id,
        updatedAt: now,
      },
    },
    { returnDocument: "after" },
  );
  if (!updated) throw new MedicalError("Appointment not found", 404);
  const [item] = await hydrateAppointments([updated]);
  return item;
}

/**
 * Withdrawing the `medical` purpose must stop processing that is already in
 * flight, not merely block the next booking. Completed tests keep their
 * records: those are the result of processing that was lawful when it happened.
 */
export async function cancelScheduledMedicalOnWithdrawal(
  userId: string,
): Promise<number> {
  if (!userId) return 0;
  const result = await appointments().updateMany(
    { applicantId: matchId(userId) as never, status: "scheduled" },
    {
      $set: {
        status: "cancelled",
        notes: "Cancelled automatically: medical consent withdrawn.",
        updatedAt: new Date(),
      },
    },
  );
  return result.modifiedCount;
}

export async function listCandidateMedicalReports(
  userId: string,
): Promise<CandidateMedicalReport[]> {
  await ensureIndexes();
  if (!userId) return [];
  const docs = await appointments()
    .find({
      applicantId: matchId(userId) as never,
      "reports.0": { $exists: true },
    })
    .sort({ updatedAt: -1 })
    .toArray();
  if (!docs.length) return [];
  const items = await hydrateAppointments(docs);
  return items.flatMap((item) =>
    item.reports.map((report) => ({
      ...report,
      appointmentId: item.id,
      jobId: item.jobId,
      jobTitle: item.jobTitle,
    })),
  );
}
