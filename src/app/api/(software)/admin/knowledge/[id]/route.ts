import { after, type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { embeddingModel, getAiRuntime } from "@/lib/ai/runtime";
import { requireProfile } from "@/lib/auth/session";
import { ingestKnowledgeSource } from "@/lib/knowledge/ingest";
import {
  deleteKnowledgeSource,
  getKnowledgeSource,
  requeueKnowledgeSource,
} from "@/lib/knowledge/store";
import { formatZodError, idHex } from "@/lib/utils";

export const maxDuration = 300;

const paramsSchema = z.object({
  id: z.string().trim().min(1),
});

type RouteContext = { params: Promise<{ id: string }> };

/** Retry background ingest. Admin-only. */
export async function POST(_req: NextRequest, context: RouteContext) {
  try {
    const auth = await requireProfile("admin");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const parsed = paramsSchema.safeParse(await context.params);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }

    const source = await getKnowledgeSource(parsed.data.id);
    if (!source) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }
    if (source.status === "processing") {
      return NextResponse.json(
        { error: "This document is already processing" },
        { status: 409 },
      );
    }

    const queued = await requeueKnowledgeSource(parsed.data.id);
    if (!queued) {
      return NextResponse.json(
        { error: "Could not re-queue this document" },
        { status: 409 },
      );
    }

    const settings = await getAiRuntime();
    const sourceId = idHex(source._id);
    after(() =>
      ingestKnowledgeSource({
        sourceId,
        embeddingModel: embeddingModel(settings),
      }),
    );

    return NextResponse.json({ ok: true, status: "queued" });
  } catch (error) {
    console.error("POST /api/admin/knowledge/[id]:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

/** Delete a PDF and its chunks. Admin-only. */
export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const auth = await requireProfile("admin");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const parsed = paramsSchema.safeParse(await context.params);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }

    const deleted = await deleteKnowledgeSource(parsed.data.id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/admin/knowledge/[id]:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
