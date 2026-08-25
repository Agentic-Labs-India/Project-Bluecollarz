import "server-only";

import type { ExtractedPage } from "@/lib/knowledge/chunk";

function stripPdfNulls(text: string): string {
  return text.split("\0").join("").trim();
}

async function extractWithUnpdf(bytes: Uint8Array): Promise<ExtractedPage[]> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(text) ? text : [text];
  return pages
    .map((pageText, index) => ({
      page: index + 1,
      text: stripPdfNulls(pageText),
    }))
    .filter((page) => page.text.length > 0);
}

async function extractWithPdfParse(
  bytes: Uint8Array,
): Promise<ExtractedPage[]> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: bytes });
  try {
    const result = await parser.getText();
    return result.pages
      .map((page) => ({
        page: page.num,
        text: stripPdfNulls(page.text),
      }))
      .filter((page) => page.text.length > 0);
  } finally {
    await parser.destroy();
  }
}

/** Page-preserving PDF text. unpdf first; pdf-parse if that fails. */
export async function extractPdfPages(
  bytes: Uint8Array,
): Promise<ExtractedPage[]> {
  try {
    const pages = await extractWithUnpdf(bytes);
    if (pages.length) return pages;
  } catch (error) {
    console.warn("unpdf extract failed, falling back to pdf-parse:", error);
  }

  const fallback = await extractWithPdfParse(bytes);
  if (!fallback.length) {
    throw new Error(
      "No extractable text. This PDF may be scanned images only.",
    );
  }
  return fallback;
}
