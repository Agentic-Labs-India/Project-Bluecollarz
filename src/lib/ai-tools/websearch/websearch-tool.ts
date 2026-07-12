import { tool } from "ai";
import { z } from "zod";
import { searchWeb } from "./search";

export const websearchTool = tool({
  description:
    "Search the web for recent facts, documentation, or pages the user asks about. Prefer this tool when the user uses @searchWebTool or needs information beyond your training cutoff. Returns titles, URLs, and snippets.",
  inputSchema: z.object({
    query: z.string().describe("Search query in plain language"),
    maxResults: z
      .number()
      .min(1)
      .max(10)
      .optional()
      .describe("Number of results (1–10, default 8)"),
  }),
  execute: async ({ query, maxResults }) => {
    try {
      const { source, results, blocked } = await searchWeb(
        query,
        maxResults ?? 8,
      );
      return {
        source,
        query: query.trim().slice(0, 500),
        results,
        blocked: blocked ?? false,
        hint: blocked
          ? "No results from Yahoo or Bing RSS. Try rephrasing the query."
          : `Results from ${source} (regex scrape).`,
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Search failed";
      return {
        error: true as const,
        query: query.trim().slice(0, 500),
        message,
      };
    }
  },
});
