import { generateText, Output } from "ai";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getAiRuntime,
  llmModel,
  llmTemp,
  renderJobOverviewPrompt,
} from "@/lib/ai/runtime";
import { requireProfile } from "@/lib/auth/session";
import { rateLimitPerMinute, tooManyRequests } from "@/lib/core/rate-limit";
import { PREFERRED_REGION } from "@/lib/core/region";
import { sanitizeRichTextHtml } from "@/lib/core/rich-text";
import { findProhibitedOutput } from "@/lib/legal-safety/lexicon";

export const maxDuration = 60;
export const preferredRegion = PREFERRED_REGION;

const requestSchema = z.object({
  roleType: z.string().trim().min(2).max(120),
  experience: z.string().trim().min(1).max(120),
  mustHaves: z.string().trim().max(800).optional().default(""),
  notes: z.string().trim().max(800).optional().default(""),
  title: z.string().trim().max(200).optional().default(""),
  pay: z.string().trim().max(100).optional().default(""),
  locationLabel: z.string().trim().max(160).optional().default(""),
  employmentType: z.string().trim().max(40).optional().default(""),
});

const overviewSchema = z.object({
  summary: z.string().min(20).max(1200),
  responsibilities: z.array(z.string().min(4).max(240)).min(3).max(10),
  requirements: z.array(z.string().min(4).max(240)).min(3).max(10),
  // OpenAI structured output requires every key in `required` — use empty [] / "".
  niceToHave: z.array(z.string().min(1).max(200)).max(6),
  workingConditions: z.string().max(600),
});

function escapeText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function listHtml(items: string[]): string {
  if (!items.length) return "";
  return `<ul>${items.map((item) => `<li>${escapeText(item)}</li>`).join("")}</ul>`;
}

function overviewToHtml(data: z.infer<typeof overviewSchema>): string {
  const parts: string[] = [
    "<h2>Role overview</h2>",
    `<p>${escapeText(data.summary)}</p>`,
    "<h2>Responsibilities</h2>",
    listHtml(data.responsibilities),
    "<h2>Requirements</h2>",
    listHtml(data.requirements),
  ];
  if (data.niceToHave.length) {
    parts.push("<h2>Nice to have</h2>", listHtml(data.niceToHave));
  }
  if (data.workingConditions.trim()) {
    parts.push(
      "<h2>Working conditions</h2>",
      `<p>${escapeText(data.workingConditions.trim())}</p>`,
    );
  }
  return sanitizeRichTextHtml(parts.join(""));
}

/**
 * Generate an industry-standard rich-text job overview for hire job creation.
 * Body: { roleType, experience, mustHaves?, notes?, title?, pay?, locationLabel?, employmentType? }
 */
export async function POST(req: NextRequest) {
  const auth = await requireProfile("hire");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const limit = await rateLimitPerMinute("jobOverview", auth.user.id);
  if (!limit.ok) return tooManyRequests(limit);

  try {
    const body = await req.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            "Tell us the role type and experience level to generate an overview.",
        },
        { status: 400 },
      );
    }

    const input = parsed.data;
    const contextLines = [
      `Role / trade: ${input.roleType}`,
      `Experience: ${input.experience}`,
      input.mustHaves ? `Must-haves: ${input.mustHaves}` : null,
      input.notes ? `Extra notes: ${input.notes}` : null,
      input.title ? `Job title (draft): ${input.title}` : null,
      input.pay ? `Pay: ${input.pay}` : null,
      input.locationLabel ? `Location: ${input.locationLabel}` : null,
      input.employmentType ? `Employment type: ${input.employmentType}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const settings = await getAiRuntime();
    const { output } = await generateText({
      model: llmModel(settings),
      temperature: llmTemp(settings, "jobOverview"),
      output: Output.object({ schema: overviewSchema }),
      prompt: renderJobOverviewPrompt(settings, contextLines),
    });

    if (!output) {
      return NextResponse.json(
        { error: "Could not generate overview. Try again." },
        { status: 502 },
      );
    }

    const html = overviewToHtml(output);
    const plain = html.replace(/<[^>]+>/g, " ").trim();
    if (plain.length < 40) {
      return NextResponse.json(
        {
          error:
            "Generated overview was too short. Try again with more detail.",
        },
        { status: 502 },
      );
    }

    // Overviews are published to candidates, so PAD-0003 and PAD-0008 apply
    // here even though a recruiter triggered the generation.
    const violations = findProhibitedOutput(plain);
    if (violations.length > 0) {
      console.error("[legal-safety] blocked job overview", {
        claims: violations.map((violation) => violation.claim),
      });
      return NextResponse.json(
        {
          error:
            "The generated overview made a claim we can't publish, such as a guarantee. Try again, or write it yourself.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ overview: html });
  } catch (error) {
    console.error("POST /api/hire/job-overview:", error);
    return NextResponse.json(
      { error: "Failed to generate overview." },
      { status: 500 },
    );
  }
}
