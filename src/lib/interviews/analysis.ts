import { generateText, Output } from "ai";
import { z } from "zod";
import {
  getAiRuntime,
  llmModel,
  llmTemp,
  renderAnalysisPrompt,
} from "@/lib/ai/runtime";
import type {
  CommunicationAnalysis,
  InterviewStageId,
  InterviewTranscriptTurn,
} from "@/lib/interviews";
import { findProhibitedOutput } from "@/lib/legal-safety/lexicon";

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

/** Score interview transcript via AI Gateway (prompt varies by stage). */
export async function analyzeInterviewTranscript(opts: {
  stageId: InterviewStageId;
  jobTitle: string;
  jobOverview?: string;
  transcript: InterviewTranscriptTurn[];
}): Promise<CommunicationAnalysis> {
  const dialogue = opts.transcript
    .map(
      (t) =>
        `${t.role === "assistant" ? "Interviewer" : "Candidate"}: ${t.text}`,
    )
    .join("\n");

  try {
    const settings = await getAiRuntime();
    const { output } = await generateText({
      model: llmModel(settings),
      temperature: llmTemp(settings, "analysis"),
      output: Output.object({ schema: analysisSchema }),
      prompt: renderAnalysisPrompt(settings, {
        domain: opts.stageId === "ai-domain",
        jobTitle: opts.jobTitle,
        jobOverview: opts.jobOverview,
        dialogue,
      }),
    });

    if (!output) {
      return fallbackAnalysis(opts.stageId);
    }

    // A transcript describing abuse invites the model to name the offence. That
    // determination belongs to the serious-offence gate and a human reviewer,
    // never to a score attached to the candidate's record.
    const prose = [output.summary, ...output.strengths, ...output.improvements];
    const violations = prose.flatMap(findProhibitedOutput);
    if (violations.length > 0) {
      console.error("[legal-safety] blocked interview analysis", {
        claims: violations.map((violation) => violation.claim),
      });
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
