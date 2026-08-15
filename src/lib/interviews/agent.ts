import { isStepCount, ToolLoopAgent, tool } from "ai";
import { z } from "zod";
import type { AiInterviewStageId } from "@/lib/interviews";
import {
  getAiRuntime,
  llmModel,
  llmTemp,
  renderInterviewPrompt,
} from "@/lib/ai/runtime";

/** Same ToolLoopAgent shape for every AI interview stage — only instructions change. */
export async function buildInterviewAgent(opts: {
  interviewId: string;
  stageId: AiInterviewStageId;
  jobTitle: string;
  jobOverview?: string;
  /** Profile voice language (Sarvam locale). */
  languageCode?: string | null;
}) {
  const settings = await getAiRuntime();
  const isDomain = opts.stageId === "ai-domain";
  const instructions = renderInterviewPrompt(settings, {
    domain: isDomain,
    jobTitle: opts.jobTitle,
    jobOverview: opts.jobOverview,
    languageCode: opts.languageCode,
  });

  return new ToolLoopAgent({
    id: isDomain ? "ai-domain-interview" : "ai-communication-interview",
    model: llmModel(settings),
    temperature: llmTemp(settings, "interview"),
    instructions,
    stopWhen: isStepCount(16),
    tools: {
      finishInterview: tool({
        description: isDomain
          ? "End the domain interview when you have enough signal to score domain knowledge and role fit."
          : "End the communication interview when you have enough signal to score communication skills.",
        inputSchema: z.object({
          reason: z
            .string()
            .max(200)
            .optional()
            .describe("Brief reason the interview is complete"),
        }),
        execute: async ({ reason }) => ({
          ok: true,
          interviewId: opts.interviewId,
          reason:
            reason ??
            (isDomain
              ? "Enough domain signal collected"
              : "Enough communication signal collected"),
          message:
            "Interview questions are done. The client should upload the recording and finalize.",
        }),
      }),
    },
  });
}
