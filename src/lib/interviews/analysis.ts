import { generateText, Output } from "ai";
import { z } from "zod";
import type {
  CommunicationAnalysis,
  InterviewStageId,
  InterviewTranscriptTurn,
} from "@/lib/interviews";
import { htmlToPlainText } from "@/lib/rich-text";

const gatewayModel = process.env.AI_GATEWAY_MODEL?.trim() || "openai/gpt-4o";

const analysisSchema = z.object({
  clarity: z.number().min(0).max(10),
  fluency: z.number().min(0).max(10),
  confidence: z.number().min(0).max(10),
  professionalism: z.number().min(0).max(10),
  overall: z.number().min(0).max(10),
  summary: z.string().min(20).max(2000),
  strengths: z.array(z.string().min(1).max(200)).max(6),
  improvements: z.array(z.string().min(1).max(200)).max(6),
});

function analysisPrompt(opts: {
  stageId: InterviewStageId;
  jobTitle: string;
  jobOverview?: string;
  dialogue: string;
}): string {
  if (opts.stageId === "ai-domain") {
    const overview =
      htmlToPlainText(opts.jobOverview ?? "").trim() ||
      "(no overview provided)";
    return `You are scoring a candidate's DOMAIN interview for the role "${opts.jobTitle}".
Use the role overview as the ground truth for what matters:
"""
${overview.slice(0, 6000)}
"""
Map scores as:
- clarity = how clearly they explain domain concepts
- fluency = how smoothly they reason through domain topics
- confidence = composure when discussing the domain
- professionalism = judgment and workplace maturity in domain scenarios
Focus on domain knowledge, practical judgment, and role fit — not pure soft skills.
Score each dimension 0–10. Be fair and specific.
Return strengths and improvements as short actionable bullets.

Transcript:
${opts.dialogue || "(empty transcript)"}`;
  }

  return `You are scoring a candidate's COMMUNICATION interview for the role "${opts.jobTitle}".
Focus only on communication skills (clarity, fluency, confidence, professionalism) — not domain expertise.
Score each dimension 0–10. Be fair and specific.
Return strengths and improvements as short actionable bullets.

Transcript:
${opts.dialogue || "(empty transcript)"}`;
}

/** Score interview transcript via AI Gateway (prompt varies by stage). */
export async function analyzeInterviewTranscript(opts: {
  stageId: InterviewStageId;
  jobTitle: string;
  jobOverview?: string;
  transcript: InterviewTranscriptTurn[];
}): Promise<CommunicationAnalysis> {
  const dialogue = opts.transcript
    .map((t) => `${t.role === "assistant" ? "Interviewer" : "Candidate"}: ${t.text}`)
    .join("\n");

  try {
    const { output } = await generateText({
      model: gatewayModel,
      output: Output.object({ schema: analysisSchema }),
      prompt: analysisPrompt({
        stageId: opts.stageId,
        jobTitle: opts.jobTitle,
        jobOverview: opts.jobOverview,
        dialogue,
      }),
    });

    if (!output) {
      return fallbackAnalysis(opts.stageId);
    }
    return output;
  } catch {
    return fallbackAnalysis(opts.stageId);
  }
}

function fallbackAnalysis(stageId: InterviewStageId): CommunicationAnalysis {
  const domain = stageId === "ai-domain";
  return {
    clarity: 5,
    fluency: 5,
    confidence: 5,
    professionalism: 5,
    overall: 5,
    summary: domain
      ? "Interview completed. Automatic domain scoring was unavailable; please review the transcript manually."
      : "Interview completed. Automatic scoring was unavailable; please review the transcript manually.",
    strengths: ["Completed the interview"],
    improvements: [
      domain
        ? "Review transcript for domain depth and role fit"
        : "Review transcript for finer communication coaching",
    ],
  };
}
