import "server-only";

import {
  getPlatformSettings,
  llmTemperature,
} from "@/lib/admin/platform-settings";
import type { PlatformSettingsPublic } from "@/lib/admin/platform-settings-types";
import {
  VOICE_TOOL_DATA_PROMPT,
  voiceLanguagePrompt,
} from "@/lib/ai/voice/languages";
import {
  applyPromptTemplate,
  ensurePromptContains,
} from "@/lib/core/prompt-template";
import { htmlToPlainText } from "@/lib/core/rich-text";
import { helpAudienceLine } from "@/lib/support/prompt";
import type { ProfileType } from "@/lib/user/profile-types";

export async function getAiRuntime(): Promise<PlatformSettingsPublic> {
  return getPlatformSettings();
}

export function llmModel(settings: PlatformSettingsPublic): string {
  return settings.llm.model;
}

export function embeddingModel(settings: PlatformSettingsPublic): string {
  return settings.llm.embeddingModel;
}

export function llmTemp(
  settings: PlatformSettingsPublic,
  key: Parameters<typeof llmTemperature>[1],
): number {
  return llmTemperature(settings, key);
}

export function renderHelpPrompt(
  settings: PlatformSettingsPublic,
  profileType: ProfileType,
  languageCode?: string | null,
): string {
  const audience = helpAudienceLine(profileType);
  const languagePrompt = voiceLanguagePrompt(languageCode);
  return ensurePromptContains(
    ensurePromptContains(
      applyPromptTemplate(settings.prompts.help, { audience, languagePrompt }),
      audience,
      "Audience:",
    ),
    languagePrompt,
    "Language:",
  );
}

export function renderOnboardingPrompt(
  settings: PlatformSettingsPublic,
  vars: {
    languageCode?: string | null;
    geoPlacePrompt: string;
    resumeContext: string;
  },
): string {
  const languagePrompt = voiceLanguagePrompt(vars.languageCode);
  const rendered = applyPromptTemplate(settings.prompts.onboarding, {
    languagePrompt,
    voiceDelivery: settings.prompts.voiceDelivery,
    voiceToolData: VOICE_TOOL_DATA_PROMPT,
    geoPlacePrompt: vars.geoPlacePrompt,
  })
    .replace(
      /NEVER ask for phone number, email, Aadhaar, PAN(?:, gender, or date of birth|, or gender)[^\n]*/g,
      "NEVER ask for name, email, phone, location, gender, PAN, date of birth, or Aadhaar — DigiLocker KYC fills identity after this interview.",
    )
    .replace(/Age gate:[^\n]*\n?/g, "")
    .replace(
      /Interview fields only:[^\n]*/g,
      "Interview fields only: currently working as (headline / current role), years of experience (number, 0 is ok), education (at least one entry), work experience (at least one entry), and languages.",
    );
  return ensurePromptContains(
    ensurePromptContains(rendered, vars.resumeContext, "Session state:"),
    languagePrompt,
    "Language:",
  );
}

export function renderInterviewPrompt(
  settings: PlatformSettingsPublic,
  opts: {
    domain: boolean;
    jobTitle: string;
    jobOverview?: string;
    languageCode?: string | null;
  },
): string {
  const overview =
    htmlToPlainText(opts.jobOverview ?? "").trim() ||
    "No detailed overview was provided.";
  const languagePrompt = voiceLanguagePrompt(opts.languageCode);
  const template = opts.domain
    ? settings.prompts.interviewDomain
    : settings.prompts.interviewCommunication;
  let rendered = applyPromptTemplate(template, {
    jobTitle: opts.jobTitle,
    jobOverview: overview.slice(0, 6000),
    languagePrompt,
    voiceDelivery: settings.prompts.voiceDelivery,
    voiceToolData: VOICE_TOOL_DATA_PROMPT,
  });
  rendered = ensurePromptContains(rendered, opts.jobTitle, "Role title:");
  if (opts.domain) {
    rendered = ensurePromptContains(
      rendered,
      overview.slice(0, 6000),
      "Role overview:",
    );
  }
  rendered = ensurePromptContains(rendered, languagePrompt, "Language:");
  rendered = ensurePromptContains(
    rendered,
    settings.prompts.voiceDelivery,
    "Voice delivery:",
  );
  return ensurePromptContains(
    rendered,
    VOICE_TOOL_DATA_PROMPT,
    "Structured data:",
  );
}

export function renderAnalysisPrompt(
  settings: PlatformSettingsPublic,
  opts: {
    domain: boolean;
    jobTitle: string;
    jobOverview?: string;
    dialogue: string;
  },
): string {
  const overview =
    htmlToPlainText(opts.jobOverview ?? "").trim() || "(no overview provided)";
  const template = opts.domain
    ? settings.prompts.interviewAnalysisDomain
    : settings.prompts.interviewAnalysisCommunication;
  let rendered = applyPromptTemplate(template, {
    jobTitle: opts.jobTitle,
    jobOverview: overview.slice(0, 6000),
    dialogue: opts.dialogue || "(empty transcript)",
  });
  if (opts.domain) {
    rendered = ensurePromptContains(
      rendered,
      overview.slice(0, 6000),
      "Role overview:",
    );
  }
  return ensurePromptContains(
    rendered,
    opts.dialogue || "(empty transcript)",
    "Transcript:",
  );
}

export function renderProfileSummaryPrompt(
  settings: PlatformSettingsPublic,
  facts: string,
): string {
  return ensurePromptContains(
    applyPromptTemplate(settings.prompts.profileSummary, { facts }),
    facts,
    "Facts:",
  );
}

export function renderJobOverviewPrompt(
  settings: PlatformSettingsPublic,
  brief: string,
): string {
  return ensurePromptContains(
    applyPromptTemplate(settings.prompts.jobOverview, { brief }),
    brief,
    "Recruiter brief:",
  );
}

export function renderKnowledgePrompt(
  settings: PlatformSettingsPublic,
): string {
  return ensurePromptContains(
    settings.prompts.knowledge,
    [
      "Always call a tool before you answer.",
      "Use listDocuments when the user asks what files exist, whether anything is uploaded, or for a catalogue.",
      "Use searchDocuments for the content of those files. Put the topic in the query string.",
      "Do not set docType=legal just because the question mentions law, legalities, or a legal memo — that field is only the admin upload tag. A legal memo may be tagged general. Only pass docType when the user explicitly asks to restrict to that tag, or the UI already applied a filter.",
    ].join(" "),
    "Tool use:",
  );
}
