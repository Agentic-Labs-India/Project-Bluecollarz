import { z } from "zod";
import {
  countryName,
  isIsoCountryCode,
  stateName,
} from "@/lib/core/geo/places";
import {
  DEFAULT_CLOSE_TIME,
  DEFAULT_OPEN_TIME,
  DEFAULT_OPERATING_DAYS,
  HM_RE,
  type MedicalHours,
  minutesFromHm,
  YMD_RE,
} from "@/lib/medical/time";

export const MEDICAL_APPOINTMENT_STATUSES = [
  "scheduled",
  "completed",
  "cancelled",
  "no_show",
  "unfit",
] as const;
export type MedicalAppointmentStatus =
  (typeof MEDICAL_APPOINTMENT_STATUSES)[number];

export const MEDICAL_PIPELINE_STATUSES = [
  "pending",
  "scheduled",
  "completed",
  "failed",
] as const;
export type MedicalPipelineStatus = (typeof MEDICAL_PIPELINE_STATUSES)[number];

export function medicalPipelineFromAppointment(
  status?: MedicalAppointmentStatus | null,
): MedicalPipelineStatus {
  if (status === "completed") return "completed";
  if (status === "scheduled") return "scheduled";
  if (status === "no_show" || status === "unfit") return "failed";
  return "pending";
}

export class MedicalError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "MedicalError";
    this.status = status;
  }
}

const optionalText = z.string().trim().max(2000).optional();

export const medicalYmdSchema = z.string().trim().regex(YMD_RE);
export const medicalHmSchema = z.string().trim().regex(HM_RE);

export const medicalCenterInputSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    licenseNumber: z.string().trim().min(1).max(80),
    licenseAuthority: z
      .string()
      .trim()
      .max(160)
      .optional()
      .transform((value) => value || undefined),
    licenseExpiry: z
      .string()
      .trim()
      .optional()
      .transform((value) => value || undefined)
      .refine(
        (value) => !value || YMD_RE.test(value),
        "License expiry must be yyyy-MM-dd",
      ),
    address: z.string().trim().min(5).max(400),
    countryCode: z
      .string()
      .trim()
      .length(2)
      .refine((code) => isIsoCountryCode(code), "Invalid country"),
    stateCode: z
      .string()
      .trim()
      .max(16)
      .optional()
      .nullable()
      .transform((value) => value || null),
    city: z.string().trim().min(1).max(120),
    phone: z
      .string()
      .trim()
      .max(40)
      .optional()
      .transform((value) => value || undefined),
    email: z
      .string()
      .trim()
      .max(160)
      .optional()
      .transform((value) => value || undefined)
      .refine(
        (value) => !value || z.string().email().safeParse(value).success,
        "Invalid email",
      ),
    mapsUrl: z
      .string()
      .trim()
      .max(500)
      .optional()
      .transform((value) => value || undefined)
      .refine(
        (value) => !value || z.string().url().safeParse(value).success,
        "Invalid maps URL",
      ),
    notes: optionalText,
    operatingDays: z
      .array(z.number().int().min(0).max(6))
      .min(1)
      .max(7)
      .default([...DEFAULT_OPERATING_DAYS])
      .transform((days) => [...new Set(days)].sort((a, b) => a - b)),
    openTime: medicalHmSchema.default(DEFAULT_OPEN_TIME),
    closeTime: medicalHmSchema.default(DEFAULT_CLOSE_TIME),
    active: z.boolean().optional().default(true),
  })
  .superRefine((value, ctx) => {
    if (minutesFromHm(value.openTime) + 30 > minutesFromHm(value.closeTime)) {
      ctx.addIssue({
        code: "custom",
        path: ["closeTime"],
        message: "Closing time must be at least 30 minutes after opening",
      });
    }
  });

export type MedicalCenterInput = z.infer<typeof medicalCenterInputSchema>;

export const scheduleAppointmentSchema = z.object({
  applicationId: z.string().trim().min(1),
  centerId: z.string().trim().min(1),
  date: medicalYmdSchema,
  time: medicalHmSchema,
  notes: optionalText,
});

export const candidateScheduleSchema = z.object({
  jobId: z.string().trim().min(1),
  centerId: z.string().trim().min(1),
  date: medicalYmdSchema,
  time: medicalHmSchema,
});

export const candidateSlotsQuerySchema = z.object({
  centerId: z.string().trim().min(1),
  date: medicalYmdSchema,
  jobId: z.string().trim().min(1).optional(),
});

export const adminSlotsQuerySchema = z.object({
  centerId: z.string().trim().min(1),
  date: medicalYmdSchema,
  excludeAppointmentId: z.string().trim().min(1).optional(),
});

export type CandidateScheduleInput = z.infer<typeof candidateScheduleSchema>;

export type ScheduleAppointmentInput = z.infer<
  typeof scheduleAppointmentSchema
>;

export const patchAppointmentSchema = z.object({
  id: z.string().trim().min(1),
  centerId: z.string().trim().min(1).optional(),
  date: medicalYmdSchema.optional(),
  time: medicalHmSchema.optional(),
  status: z.enum(["scheduled", "cancelled", "no_show", "unfit"]).optional(),
  notes: optionalText,
});

export type PatchAppointmentInput = z.infer<typeof patchAppointmentSchema>;

export type MedicalCenterListItem = {
  id: string;
  name: string;
  licenseNumber: string;
  licenseAuthority: string | null;
  licenseExpiry: string | null;
  address: string;
  countryCode: string;
  stateCode: string | null;
  city: string;
  phone: string | null;
  email: string | null;
  mapsUrl: string | null;
  notes: string | null;
  hours: MedicalHours;
  hoursLabel: string;
  active: boolean;
  placeLabel: string;
  directionsUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type MedicalReport = {
  id: string;
  name: string;
  url: string;
  contentType: string;
  uploadedAt: string;
};

export const MEDICAL_QUEUE_STATUSES = [
  "unscheduled",
  "scheduled",
  "completed",
  "no_show",
  "unfit",
  "cancelled",
] as const;
export type MedicalQueueStatus = (typeof MEDICAL_QUEUE_STATUSES)[number];

export const medicalQueueQuerySchema = z
  .object({
    from: medicalYmdSchema.optional(),
    to: medicalYmdSchema.optional(),
    status: z.enum(MEDICAL_QUEUE_STATUSES).optional(),
    centerId: z
      .string()
      .trim()
      .regex(/^[a-fA-F0-9]{24}$/)
      .optional(),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: "From date must be on or before to date",
    path: ["to"],
  });

export type MedicalQueueQuery = z.infer<typeof medicalQueueQuerySchema>;

export const completeMedicalSchema = z.object({
  appointmentId: z.string().trim().min(1),
  reports: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(200),
        url: z.string().trim().url().max(2000),
        contentType: z.string().trim().min(1).max(120),
      }),
    )
    .min(1)
    .max(10),
});

export type CompleteMedicalInput = z.infer<typeof completeMedicalSchema>;

export type CandidateMedicalReport = MedicalReport & {
  appointmentId: string;
  jobId: string;
  jobTitle: string;
};

export type MedicalAppointmentListItem = {
  id: string;
  applicationId: string;
  applicantId: string;
  applicantName: string | null;
  applicantEmail: string | null;
  jobId: string;
  jobTitle: string;
  centerId: string;
  centerName: string;
  centerAddress: string;
  centerCity: string;
  centerPlaceLabel: string;
  directionsUrl: string;
  scheduledAt: string;
  status: MedicalAppointmentStatus;
  notes: string | null;
  reports: MedicalReport[];
  assignedByEmail: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MedicalQueueItem = {
  applicationId: string;
  applicantId: string;
  applicantName: string | null;
  applicantEmail: string | null;
  jobId: string;
  jobTitle: string;
  selectedAt: string;
  appointment: MedicalAppointmentListItem | null;
};

export type CandidateMedicalAppointment = {
  id: string;
  applicationId: string;
  jobId: string;
  jobTitle: string;
  scheduledAt: string;
  status: MedicalAppointmentStatus;
  center: {
    id: string;
    name: string;
    address: string;
    city: string;
    placeLabel: string;
    directionsUrl: string;
  };
};

export type CandidateMedicalCenter = {
  id: string;
  name: string;
  address: string;
  city: string;
  countryCode: string;
  stateCode: string | null;
  phone: string | null;
  placeLabel: string;
  directionsUrl: string;
  hours: MedicalHours;
  hoursLabel: string;
};

export type CandidateMedicalScheduleContext = {
  jobId: string;
  jobTitle: string;
  applicationId: string;
  appointment: CandidateMedicalAppointment | null;
  centers: CandidateMedicalCenter[];
};

export function toPublicMedicalCenter(
  center: MedicalCenterListItem,
): CandidateMedicalCenter {
  return {
    id: center.id,
    name: center.name,
    address: center.address,
    city: center.city,
    countryCode: center.countryCode,
    stateCode: center.stateCode,
    phone: center.phone,
    placeLabel: center.placeLabel,
    directionsUrl: center.directionsUrl,
    hours: center.hours,
    hoursLabel: center.hoursLabel,
  };
}

export function medicalPlaceLabel(opts: {
  address?: string | null;
  city?: string | null;
  countryCode?: string | null;
  stateCode?: string | null;
}): string {
  const state = stateName(opts.countryCode, opts.stateCode);
  const country = countryName(opts.countryCode);
  return [opts.city, state, country].filter(Boolean).join(", ");
}

export function medicalDirectionsUrl(opts: {
  mapsUrl?: string | null;
  address?: string | null;
  city?: string | null;
  countryCode?: string | null;
  stateCode?: string | null;
}): string {
  const explicit = opts.mapsUrl?.trim();
  if (explicit) return explicit;
  const query = [
    opts.address,
    opts.city,
    stateName(opts.countryCode, opts.stateCode),
    countryName(opts.countryCode),
  ]
    .filter(Boolean)
    .join(", ");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
}
