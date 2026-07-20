import type { InterviewStageId } from "@/lib/interviews";

/** Short label used in spoken kickoff copy ("communication" | "domain"). */
export function interviewStageLabel(stageId: InterviewStageId): string {
  return stageId === "ai-domain" ? "domain" : "communication";
}

/** Human title for UI headers. */
export function interviewStageTitle(stageId: InterviewStageId): string {
  return stageId === "ai-domain"
    ? "AI Domain Interview"
    : "AI Communication Interview";
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
