import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import {
  KNOWLEDGE_CHUNK_OVERLAP,
  KNOWLEDGE_CHUNK_SIZE,
} from "@/lib/knowledge/types";

export type ExtractedPage = {
  page: number;
  text: string;
};

export type PageChunk = {
  text: string;
  page: number;
  chunkIndex: number;
};

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: KNOWLEDGE_CHUNK_SIZE,
  chunkOverlap: KNOWLEDGE_CHUNK_OVERLAP,
  separators: ["\n\n", "\n", ". ", "; ", ", ", " ", ""],
});

/** Split each page on its own so citations keep a real page number. */
export async function chunkPages(pages: ExtractedPage[]): Promise<PageChunk[]> {
  const out: PageChunk[] = [];
  let chunkIndex = 0;
  for (const page of pages) {
    const pieces = await splitter.splitText(page.text);
    for (const piece of pieces) {
      const text = piece.trim();
      if (!text) continue;
      out.push({ text, page: page.page, chunkIndex });
      chunkIndex += 1;
    }
  }
  return out;
}
