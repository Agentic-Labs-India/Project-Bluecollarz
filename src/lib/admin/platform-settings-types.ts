import type { TtsLanguageCode } from "@/lib/ai/voice/languages";
import type {
  SARVAM_STT_MODELS,
  SARVAM_STT_MODES,
  SARVAM_TTS_BITRATES,
  SARVAM_TTS_CODECS,
  SARVAM_TTS_MODELS,
} from "@/lib/ai/voice/sarvam-options";

export const LLM_TEMPERATURE_KEYS = [
  "help",
  "onboarding",
  "interview",
  "analysis",
  "jobOverview",
  "profileSummary",
  "resumeParse",
] as const;

export type LlmTemperatureKey = (typeof LLM_TEMPERATURE_KEYS)[number];

export const PROMPT_KEYS = [
  "help",
  "onboarding",
  "interviewCommunication",
  "interviewDomain",
  "interviewAnalysisCommunication",
  "interviewAnalysisDomain",
  "profileSummary",
  "jobOverview",
  "resumeParse",
  "voiceDelivery",
] as const;

export type PromptKey = (typeof PROMPT_KEYS)[number];

export interface GrievanceOfficerSettings {
  name: string;
  email: string;
  phone: string;
  address: string;
  languages: string[];
}

export interface LlmSettings {
  model: string;
  temperatures: Record<LlmTemperatureKey, number>;
}

export interface VoiceSettings {
  ttsModel: (typeof SARVAM_TTS_MODELS)[number];
  ttsSpeaker: string;
  ttsTemperature: number;
  ttsPace: number;
  ttsLanguageCode: TtsLanguageCode;
  ttsCodec: (typeof SARVAM_TTS_CODECS)[number];
  ttsBitrate: (typeof SARVAM_TTS_BITRATES)[number];
  sttModel: (typeof SARVAM_STT_MODELS)[number];
  sttMode: (typeof SARVAM_STT_MODES)[number];
}

export type PromptSettings = Record<PromptKey, string>;

/** Public platform settings — what admin edits and runtime consumes. */
export interface PlatformSettingsPublic {
  grievanceOfficer: GrievanceOfficerSettings;
  llm: LlmSettings;
  voice: VoiceSettings;
  prompts: PromptSettings;
  updatedAt: string | null;
  updatedBy: string | null;
}
