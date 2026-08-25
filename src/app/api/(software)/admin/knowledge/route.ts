import { after, type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { embeddingModel, getAiRuntime } from "@/lib/ai/runtime";
import { requireProfile } from "@/lib/auth/session";
import { ingestKnowledgeSource } from "@/lib/knowledge/ingest";
import {
  enqueueKnowledgeSource,
  listKnowledgeSources,
} from "@/lib/knowledge/store";
import { KNOWLEDGE_DOC_TYPES } from "@/lib/knowledge/types";
import { formatZodError } from "@/lib/utils";

export const maxDuration = 300;

const createSchema = z.object({
  filename: z.string().trim().min(1).max(200),
  docType: z.enum(KNOWLEDGE_DOC_TYPES),
  blobUrl: z.string().url(),
  blobPathname: z.string().trim().min(1).max(500),
});

/** List knowledge-base PDFs. Admin-only. */
export async function GET() {
  try {
    const auth = await requireProfile("admin");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const items = await listKnowledgeSources();
    return NextResponse.json({ items });
  } catch (error) {
    console.error("GET /api/admin/knowledge:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

/** Queue a PDF for background ingest. Admin-only. */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireProfile("admin");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }

    const item = await enqueueKnowledgeSource({
      ...parsed.data,
      uploadedBy: auth.user.id,
    });
    const settings = await getAiRuntime();
    const model = embeddingModel(settings);

    after(() =>
      ingestKnowledgeSource({
        sourceId: item.id,
        embeddingModel: model,
      }),
    );

    return NextResponse.json({ item }, { status: 202 });
  } catch (error) {
    console.error("POST /api/admin/knowledge:", error);
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
