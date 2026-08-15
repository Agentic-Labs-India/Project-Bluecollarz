import "server-only";

import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { z } from "zod";
import client, { DB_NAME, COLLECTIONS } from "@/lib/db";
import { defaultPlatformSettings } from "@/lib/admin/platform-settings-defaults";
import {
  LLM_TEMPERATURE_KEYS,
  PROMPT_KEYS,
  type LlmTemperatureKey,
  type PlatformSettingsPublic,
  type PromptKey,
} from "@/lib/admin/platform-settings-types";

export const PLATFORM_SETTINGS_CACHE_TAG = "platform-settings";
export const PLATFORM_SETTINGS_ID = "default";

const PROMPT_MAX = 24_000;

const grievanceSchema = z.object({
  name: z.string().trim().max(120),
  email: z.string().trim().email().max(200).or(z.literal("")),
  phone: z.string().trim().max(40),
  address: z.string().trim().max(400),
  languages: z.string().trim().max(120),
});

const temperaturesSchema = z.object({
  help: z.number().min(0).max(2),
  onboarding: z.number().min(0).max(2),
  interview: z.number().min(0).max(2),
  analysis: z.number().min(0).max(2),
  jobOverview: z.number().min(0).max(2),
  profileSummary: z.number().min(0).max(2),
  resumeParse: z.number().min(0).max(2),
});

const llmSchema = z.object({
  model: z.string().trim().min(1).max(120),
  temperatures: temperaturesSchema,
});

const voiceSchema = z.object({
  ttsModel: z.string().trim().min(1).max(80),
  ttsSpeaker: z.string().trim().min(1).max(80),
  ttsTemperature: z.number().min(0.01).max(2),
  ttsPace: z.number().min(0.3).max(3),
  ttsLanguageCode: z.string().trim().min(2).max(16),
  ttsCodec: z.string().trim().min(2).max(16),
  ttsBitrate: z.string().trim().min(2).max(16),
  sttModel: z.string().trim().min(1).max(80),
  sttMode: z.string().trim().min(1).max(40),
});

const promptsSchema = z.object({
  help: z.string().min(20).max(PROMPT_MAX),
  onboarding: z.string().min(20).max(PROMPT_MAX),
  interviewCommunication: z.string().min(20).max(PROMPT_MAX),
  interviewDomain: z.string().min(20).max(PROMPT_MAX),
  interviewAnalysisCommunication: z.string().min(20).max(PROMPT_MAX),
  interviewAnalysisDomain: z.string().min(20).max(PROMPT_MAX),
  profileSummary: z.string().min(20).max(PROMPT_MAX),
  jobOverview: z.string().min(20).max(PROMPT_MAX),
  resumeParse: z.string().min(20).max(PROMPT_MAX),
  voiceDelivery: z.string().min(20).max(PROMPT_MAX),
});

export const platformSettingsPatchSchema = z.object({
  grievanceOfficer: grievanceSchema,
  llm: llmSchema,
  voice: voiceSchema,
  prompts: promptsSchema,
});

export type PlatformSettingsPatch = z.infer<typeof platformSettingsPatchSchema>;

interface PlatformSettingsDocument {
  _id: typeof PLATFORM_SETTINGS_ID;
  grievanceOfficer: PlatformSettingsPublic["grievanceOfficer"];
  llm: PlatformSettingsPublic["llm"];
  voice: PlatformSettingsPublic["voice"];
  prompts: PlatformSettingsPublic["prompts"];
  updatedAt: Date;
  updatedBy: string;
}

function col() {
  return client
    .db(DB_NAME)
    .collection<PlatformSettingsDocument>(COLLECTIONS.PLATFORM_SETTINGS);
}

function clampTemp(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(2, Math.max(0, n));
}

function mergeSettings(
  stored: Partial<PlatformSettingsDocument> | null,
): PlatformSettingsPublic {
  const defaults = defaultPlatformSettings();
  const temps = { ...defaults.llm.temperatures };
  const storedTemps = stored?.llm?.temperatures;
  if (storedTemps) {
    for (const key of LLM_TEMPERATURE_KEYS) {
      temps[key] = clampTemp(storedTemps[key], temps[key]);
    }
  }

  const prompts = { ...defaults.prompts };
  if (stored?.prompts) {
    for (const key of PROMPT_KEYS) {
      const value = stored.prompts[key as PromptKey];
      if (typeof value === "string" && value.trim().length >= 20) {
        prompts[key] = value;
      }
    }
  }

  return {
    grievanceOfficer: {
      ...defaults.grievanceOfficer,
      ...stored?.grievanceOfficer,
    },
    llm: {
      model: stored?.llm?.model?.trim() || defaults.llm.model,
      temperatures: temps,
    },
    voice: {
      ...defaults.voice,
      ...stored?.voice,
    },
    prompts,
    updatedAt: stored?.updatedAt ? stored.updatedAt.toISOString() : null,
    updatedBy: stored?.updatedBy ?? null,
  };
}

async function readPlatformSettingsCached(): Promise<PlatformSettingsPublic> {
  "use cache";
  cacheLife("hours");
  cacheTag(PLATFORM_SETTINGS_CACHE_TAG);

  const doc = await col().findOne({ _id: PLATFORM_SETTINGS_ID });
  return mergeSettings(doc);
}

/** Cached platform settings. Route handlers and RSC share this tag. */
export async function getPlatformSettings(): Promise<PlatformSettingsPublic> {
  try {
    return await readPlatformSettingsCached();
  } catch (error) {
    console.error("getPlatformSettings:", error);
    return defaultPlatformSettings();
  }
}

export function revalidatePlatformSettingsCache() {
  revalidateTag(PLATFORM_SETTINGS_CACHE_TAG, "max");
}

export async function savePlatformSettings(input: {
  patch: PlatformSettingsPatch;
  updatedBy: string;
}): Promise<PlatformSettingsPublic> {
  const now = new Date();
  const doc: PlatformSettingsDocument = {
    _id: PLATFORM_SETTINGS_ID,
    grievanceOfficer: input.patch.grievanceOfficer,
    llm: input.patch.llm,
    voice: input.patch.voice,
    prompts: input.patch.prompts,
    updatedAt: now,
    updatedBy: input.updatedBy,
  };
  await col().replaceOne({ _id: PLATFORM_SETTINGS_ID }, doc, { upsert: true });
  revalidatePlatformSettingsCache();
  return mergeSettings(doc);
}

export function llmTemperature(
  settings: PlatformSettingsPublic,
  key: LlmTemperatureKey,
): number {
  return settings.llm.temperatures[key];
}
