import { languageLabel, resolveTtsLanguage } from "@/lib/ai/voice/languages";
import type { InterviewStageId } from "@/lib/interviews";

/** Short label used in spoken kickoff copy. */
export function interviewStageLabel(stageId: InterviewStageId): string {
  if (stageId === "ai-domain") return "domain";
  if (stageId === "custom-questions") return "custom questions";
  return "communication";
}

/** Human title for UI headers. */
export function interviewStageTitle(stageId: InterviewStageId): string {
  if (stageId === "ai-domain") return "AI Domain Interview";
  if (stageId === "custom-questions") return "Custom Questions";
  return "AI Communication Interview";
}

export function interviewKickoffText(
  stageId: InterviewStageId,
  jobTitle: string,
  languageCode?: string | null,
): string {
  const code = resolveTtsLanguage(languageCode);
  const label = languageLabel(code);
  return `Please start the ${interviewStageLabel(stageId)} interview for the role: ${jobTitle}. The candidate already selected ${label} (${code}) as their voice language. Greet them and conduct the entire interview in that spoken language. Do not switch languages.`;
}

export function isInterviewKickoffText(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("please start the") &&
    lower.includes("interview for the role")
  );
}
