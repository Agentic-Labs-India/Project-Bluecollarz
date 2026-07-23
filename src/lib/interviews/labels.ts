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
): string {
  return `Please start the ${interviewStageLabel(stageId)} interview for the role: ${jobTitle}. Use my profile voice language for the whole interview.`;
}

export function isInterviewKickoffText(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("please start the") &&
    lower.includes("interview for the role")
  );
}
