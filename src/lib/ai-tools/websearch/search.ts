const SEARCH_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const FETCH_TIMEOUT_MS = 18_000;

export type WebSearchHit = {
  title: string;
  url: string;
  snippet?: string;
};

type WebSearchSource = "yahoo" | "bing-rss";

type WebSearchBatch = {
  source: WebSearchSource;
  results: WebSearchHit[];
  blocked?: boolean;
};

function clampResults(n: number) {
  return Math.min(10, Math.max(1, Math.floor(n)));
}

function decodeXml(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function stripTags(html: string): string {
  return decodeXml(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function normalizeUrl(href: string): string {
  let url = href.trim();
  if (url.startsWith("//")) url = `https:${url}`;
  if (!url.startsWith("http")) return "";

  const yahooRu = url.match(/\/RU=([^/&]+)/i)?.[1];
  if (yahooRu) {
    try {
      return decodeURIComponent(yahooRu);
    } catch {
      /* keep original */
    }
  }

  try {
    return new URL(url).toString();
  } catch {
    return url;
  }
}

function firstTag(block: string, tag: string): string {
  const re = new RegExp(
    `<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`,
    "i",
  );
  return decodeXml(re.exec(block)?.[1]?.trim() ?? "");
}

function collectHits(
  maxResults: number,
  parse: (push: (title: string, href: string, snippet?: string) => void) => void,
): WebSearchHit[] {
  const hits: WebSearchHit[] = [];
  const limit = clampResults(maxResults);
  const seen = new Set<string>();

  const push = (title: string, href: string, snippet?: string) => {
    const url = normalizeUrl(href);
    const t = stripTags(title);
    if (!url || !t || seen.has(url) || hits.length >= limit) return;
    seen.add(url);
    hits.push({ title: t, url, snippet: snippet ? stripTags(snippet) : undefined });
  };

  parse(push);
  return hits;
}

async function fetchText(url: string, init?: RequestInit): Promise<string> {
  const headers = new Headers(init?.headers);
  headers.set("User-Agent", SEARCH_UA);
  headers.set("Accept-Language", "en-US,en;q=0.9");

  const res = await fetch(url, {
    ...init,
    headers,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`Search fetch failed (${res.status})`);
  }

  return res.text();
}

/** Yahoo HTML — regex; works from Vercel/datacenter IPs. */
function parseYahooHtml(html: string, maxResults: number): WebSearchHit[] {
  return collectHits(maxResults, (push) => {
    const re =
      /<h3[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>[\s\S]*?<\/h3>[\s\S]{0,1200}?href="(https?:\/\/[^"]+)"/gi;
    let m: RegExpExecArray | null = re.exec(html);
    while (m) {
      const after = html.slice(m.index, m.index + 1500);
      const snippet = /class="[^"]*compText[^"]*"[^>]*>[\s\S]*?<p[^>]*>([^<]+)</i.exec(
        after,
      )?.[1];
      push(m[1], m[2], snippet);
      m = re.exec(html);
    }
  });
}

/** Bing RSS — regex; fallback when Yahoo returns nothing. */
function parseBingRss(xml: string, maxResults: number): WebSearchHit[] {
  return collectHits(maxResults, (push) => {
    const itemRe = /<item>([\s\S]*?)<\/item>/gi;
    let m: RegExpExecArray | null = itemRe.exec(xml);
    while (m) {
      const block = m[1];
      const title = firstTag(block, "title");
      const link = firstTag(block, "link");
      const snippet = firstTag(block, "description");
      if (title && link && !/^Bing:\s/i.test(title)) {
        push(title, link, snippet);
      }
      m = itemRe.exec(xml);
    }
  });
}

async function yahooHtmlSearch(
  query: string,
  maxResults: number,
): Promise<WebSearchHit[]> {
  const url = new URL("https://search.yahoo.com/search");
  url.searchParams.set("p", query);
  const html = await fetchText(url.toString(), {
    headers: { Accept: "text/html" },
  });
  return parseYahooHtml(html, maxResults);
}

async function bingRssSearch(
  query: string,
  maxResults: number,
): Promise<WebSearchHit[]> {
  const url = new URL("https://www.bing.com/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "rss");
  const xml = await fetchText(url.toString(), {
    headers: { Accept: "application/rss+xml, application/xml, text/xml" },
  });
  return parseBingRss(xml, maxResults);
}

const SCRAPERS: Array<{
  source: WebSearchSource;
  search: (query: string, maxResults: number) => Promise<WebSearchHit[]>;
}> = [
  { source: "yahoo", search: yahooHtmlSearch },
  { source: "bing-rss", search: bingRssSearch },
];

/**
 * Free web search via regex scraping (Yahoo HTML → Bing RSS).
 * Works on Vercel; Google/Brave block cloud server IPs.
 */
export async function searchWeb(
  query: string,
  maxResults = 8,
): Promise<WebSearchBatch> {
  const q = query.trim().slice(0, 500);
  if (!q) {
    return { source: "yahoo", results: [] };
  }

  const n = clampResults(maxResults);

  for (const { source, search } of SCRAPERS) {
    try {
      const results = await search(q, n);
      if (results.length > 0) {
        return { source, results };
      }
    } catch {
      // try next
    }
  }

  return { source: "bing-rss", results: [], blocked: true };
}
