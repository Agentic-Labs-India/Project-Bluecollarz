import { stepCountIs, ToolLoopAgent, tool } from "ai";
import { z } from "zod";
import type { InterviewStageId } from "@/lib/interviews";

import { htmlToPlainText } from "@/lib/rich-text";
import { VOICE_DELIVERY_PROMPT } from "@/lib/voice/style";

const gatewayModel = process.env.AI_GATEWAY_MODEL?.trim() || "openai/gpt-4o";

function communicationInstructions(jobTitle: string): string {
  return `You are BlueCollarz's AI Communication Interviewer for the role "${jobTitle}".
Speak in short, clear spoken English (1–3 sentences). The candidate answers by voice.
${VOICE_DELIVERY_PROMPT}
Goals: assess clarity, fluency, confidence, and professionalism — not deep domain expertise.
Flow:
1. Greet briefly and explain this is a short communication interview (about 5–8 exchanges).
2. Ask one question at a time about communication at work (explaining ideas, handling conflict, stakeholder updates, remote collaboration, etc.).
3. After each answer, acknowledge briefly and ask the next question.
4. After enough signal (typically 5–8 candidate answers), thank them and call finishInterview.
Never invent facts about the candidate. Keep questions practical and fair.`;
}

function domainInstructions(jobTitle: string, jobOverview: string): string {
  const overview =
    htmlToPlainText(jobOverview).trim() || "No detailed overview was provided.";
  return `You are BlueCollarz's AI Domain Interviewer for the role "${jobTitle}".
Speak in short, clear spoken English (1–3 sentences). The candidate answers by voice.
${VOICE_DELIVERY_PROMPT}
Goals: assess domain knowledge, practical judgment, and fit for what this role requires — based on the role overview below.
Role overview / requirements:
"""
${overview.slice(0, 6000)}
"""
Flow:
1. Greet briefly and explain this is a short domain interview (about 5–8 exchanges) grounded in this role's overview.
2. Ask one question at a time about domain knowledge, tools/methods, scenarios, and expectations implied by the overview.
3. After each answer, acknowledge briefly and ask the next question. Dig into gaps when answers are vague.
4. After enough signal (typically 5–8 candidate answers), thank them and call finishInterview.
Never invent facts about the candidate or the employer. Stay fair and tied to the overview.`;
}

/** Same ToolLoopAgent shape for every AI interview stage — only instructions change. */
export function buildInterviewAgent(opts: {
  interviewId: string;
  stageId: InterviewStageId;
  jobTitle: string;
  jobOverview?: string;
}) {
  const isDomain = opts.stageId === "ai-domain";
  const instructions = isDomain
    ? domainInstructions(opts.jobTitle, opts.jobOverview ?? "")
    : communicationInstructions(opts.jobTitle);

  return new ToolLoopAgent({
    id: isDomain ? "ai-domain-interview" : "ai-communication-interview",
    model: gatewayModel,
    instructions,
    stopWhen: stepCountIs(16),
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
