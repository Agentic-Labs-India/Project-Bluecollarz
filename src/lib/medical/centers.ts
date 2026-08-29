import "server-only";

import { formatDateOnly, parseDateOnly } from "@/lib/core/dates";
import { listStatesForCountry } from "@/lib/core/geo/places";
import client, {
  COLLECTIONS,
  DB_NAME,
  isId,
  matchId,
  matchIds,
} from "@/lib/db";
import { ensureIndexes } from "@/lib/db/indexes";
import { formatOperatingSummary, toMedicalHours } from "@/lib/medical/time";
import {
  type MedicalCenterDocument,
  type MedicalCenterInput,
  type MedicalCenterListItem,
  MedicalError,
  medicalDirectionsUrl,
  medicalPlaceLabel,
} from "@/lib/medical/types";
import { idHex } from "@/lib/utils";

export type { MedicalCenterDocument };

function collection() {
  return client
    .db(DB_NAME)
    .collection<MedicalCenterDocument>(COLLECTIONS.MEDICAL_CENTERS);
}

function appointmentsCollection() {
  return client.db(DB_NAME).collection(COLLECTIONS.MEDICAL_APPOINTMENTS);
}

function toListItem(doc: MedicalCenterDocument): MedicalCenterListItem {
  const licenseExpiry = formatDateOnly(doc.licenseExpiry) || null;
  const placeLabel = medicalPlaceLabel({
    city: doc.city,
    countryCode: doc.countryCode,
    stateCode: doc.stateCode,
  });
  const hours = toMedicalHours(doc);
  return {
    id: idHex(doc._id),
    name: doc.name,
    licenseNumber: doc.licenseNumber,
    licenseAuthority: doc.licenseAuthority,
    licenseExpiry,
    address: doc.address,
    countryCode: doc.countryCode,
    stateCode: doc.stateCode,
    city: doc.city,
    phone: doc.phone,
    email: doc.email,
    mapsUrl: doc.mapsUrl,
    notes: doc.notes,
    hours,
    hoursLabel: formatOperatingSummary(hours),
    active: doc.active !== false,
    placeLabel,
    directionsUrl: medicalDirectionsUrl({
      mapsUrl: doc.mapsUrl,
      address: doc.address,
      city: doc.city,
      countryCode: doc.countryCode,
      stateCode: doc.stateCode,
    }),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function normalizeInput(input: MedicalCenterInput) {
  const states = listStatesForCountry(input.countryCode);
  if (states.length > 0 && !input.stateCode) {
    throw new MedicalError("State / province is required for this country");
  }
  const licenseExpiry = input.licenseExpiry
    ? parseDateOnly(input.licenseExpiry)
    : null;
  if (input.licenseExpiry && !licenseExpiry) {
    throw new MedicalError("Invalid license expiry");
  }
  const hours = toMedicalHours(input);
  return {
    name: input.name,
    licenseNumber: input.licenseNumber,
    licenseAuthority: input.licenseAuthority ?? null,
    licenseExpiry,
    address: input.address,
    countryCode: input.countryCode.toUpperCase(),
    stateCode: input.stateCode,
    city: input.city,
    phone: input.phone ?? null,
    email: input.email?.toLowerCase() ?? null,
    mapsUrl: input.mapsUrl ?? null,
    notes: input.notes?.trim() || null,
    operatingDays: hours.days,
    openTime: hours.open,
    closeTime: hours.close,
    active: input.active ?? true,
  };
}

export async function listMedicalCenters(opts?: {
  active?: boolean;
}): Promise<MedicalCenterListItem[]> {
  await ensureIndexes();
  const filter: Record<string, unknown> = {};
  if (opts?.active === true) filter.active = true;
  if (opts?.active === false) filter.active = false;
  const docs = await collection()
    .find(filter)
    .sort({ active: -1, name: 1 })
    .toArray();
  return docs.map(toListItem);
}

export async function getMedicalCenter(
  id: string,
): Promise<MedicalCenterListItem | null> {
  await ensureIndexes();
  if (!isId(id)) return null;
  const doc = await collection().findOne({ _id: matchId(id) as never });
  return doc ? toListItem(doc) : null;
}

export async function getMedicalCentersByIds(
  ids: string[],
): Promise<Map<string, MedicalCenterListItem>> {
  const unique = [...new Set(ids.filter(isId))];
  if (!unique.length) return new Map();
  const docs = await collection()
    .find({ _id: { $in: matchIds(unique) } as never })
    .toArray();
  return new Map(docs.map((doc) => [idHex(doc._id), toListItem(doc)]));
}

export async function createMedicalCenter(
  input: MedicalCenterInput,
): Promise<MedicalCenterListItem> {
  await ensureIndexes();
  const now = new Date();
  const fields = normalizeInput(input);
  const result = await collection().insertOne({
    ...fields,
    createdAt: now,
    updatedAt: now,
  } as never);
  const created = await collection().findOne({ _id: result.insertedId });
  if (!created) throw new MedicalError("Could not create medical center", 500);
  return toListItem(created);
}

export async function updateMedicalCenter(
  id: string,
  input: MedicalCenterInput,
): Promise<MedicalCenterListItem | null> {
  await ensureIndexes();
  if (!isId(id)) return null;
  const fields = normalizeInput(input);
  const result = await collection().findOneAndUpdate(
    { _id: matchId(id) as never },
    { $set: { ...fields, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  return result ? toListItem(result) : null;
}

export async function deleteMedicalCenter(id: string): Promise<boolean> {
  await ensureIndexes();
  if (!isId(id)) return false;
  const future = await appointmentsCollection().findOne({
    centerId: id,
    status: "scheduled",
    scheduledAt: { $gte: new Date() },
  });
  if (future) {
    throw new MedicalError(
      "Cannot delete a center with upcoming scheduled appointments",
      409,
    );
  }
  const result = await collection().deleteOne({ _id: matchId(id) as never });
  return result.deletedCount > 0;
}
