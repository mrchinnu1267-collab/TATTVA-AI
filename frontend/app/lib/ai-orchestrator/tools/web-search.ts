/**
 * TATTVA AI - Advanced Web Research Engine Tool
 * Real-time web search, full-page retrieval, authoritative source categorization,
 * and zero-fabrication citations.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { ToolDefinition, ToolExecutionResult, ExecutionContext } from "../types";

export type SourceAuthorityTier = "official_doc" | "academic_gov" | "established_pub" | "secondary";

export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
  sourceDomain: string;
  authorityTier: SourceAuthorityTier;
  publishedDate?: string;
}

export interface ExtractedPageContent {
  url: string;
  domain: string;
  title: string;
  publishedDate?: string;
  textSnippet: string;
  fullLength: number;
  authorityTier: SourceAuthorityTier;
  isAccessible: boolean;
  error?: string;
}

/**
 * Categorizes source authority based on authoritative domain patterns
 */
export function categorizeAuthority(domain: string, url: string): SourceAuthorityTier {
  const d = domain.toLowerCase();
  const u = url.toLowerCase();

  // 1. Official Documentation & Language Specs
  if (
    d.endsWith(".gov") ||
    d.endsWith(".mil") ||
    d.includes("docs.") ||
    u.includes("/docs/") ||
    u.includes("/documentation/") ||
    d.includes("python.org") ||
    d.includes("nextjs.org") ||
    d.includes("react.dev") ||
    d.includes("golang.org") ||
    d.includes("go.dev") ||
    d.includes("rust-lang.org") ||
    d.includes("developer.mozilla.org") ||
    d.includes("w3.org") ||
    d.includes("nodejs.org") ||
    d.includes("typescriptlang.org") ||
    d.includes("oracle.com") ||
    d.includes("microsoft.com") ||
    d.includes("apple.com/developer")
  ) {
    return "official_doc";
  }

  // 2. Academic Research & Primary Repositories
  if (
    d.endsWith(".edu") ||
    d.includes("arxiv.org") ||
    d.includes("researchgate.net") ||
    d.includes("nature.com") ||
    d.includes("science.org") ||
    d.includes("acm.org") ||
    d.includes("ieee.org") ||
    d.includes("nih.gov")
  ) {
    return "academic_gov";
  }

  // 3. Established Publications
  if (
    d.includes("reuters.com") ||
    d.includes("apnews.com") ||
    d.includes("bbc.com") ||
    d.includes("bloomberg.com") ||
    d.includes("theverge.com") ||
    d.includes("techcrunch.com") ||
    d.includes("wired.com") ||
    d.includes("arstechnica.com")
  ) {
    return "established_pub";
  }

  return "secondary";
}

/**
 * Searches the web using DuckDuckGo API & HTML endpoints with zero synthetic hallucination
 */
export async function performWebSearch(query: string, maxResults: number = 5): Promise<SearchResultItem[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const results: SearchResultItem[] = [];

  // 1. DuckDuckGo JSON API
  try {
    const apiUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(cleanQuery)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(apiUrl, {
      headers: { "User-Agent": "TattvaAI/2.0 (Intelligent Research Engine; +https://tattva-ai-phi.vercel.app)" },
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.AbstractText && data.AbstractURL) {
        const domain = new URL(data.AbstractURL).hostname.replace(/^www\./, "");
        results.push({
          title: data.Heading || cleanQuery,
          url: data.AbstractURL,
          snippet: data.AbstractText,
          sourceDomain: domain,
          authorityTier: categorizeAuthority(domain, data.AbstractURL),
        });
      }

      if (Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics) {
          if (results.length >= maxResults) break;
          if (topic.Text && topic.FirstURL) {
            try {
              const domain = new URL(topic.FirstURL).hostname.replace(/^www\./, "");
              results.push({
                title: topic.Text.slice(0, 80),
                url: topic.FirstURL,
                snippet: topic.Text,
                sourceDomain: domain,
                authorityTier: categorizeAuthority(domain, topic.FirstURL),
              });
            } catch {}
          }
        }
      }
    }
  } catch {
    // API timeout, fallback to HTML
  }

  // 2. DuckDuckGo HTML Fallback
  if (results.length < maxResults) {
    try {
      const htmlUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanQuery)}`;
      const res = await fetch(htmlUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(7000),
      });

      if (res.ok) {
        const html = await res.text();
        const snippetMatches = [...html.matchAll(/<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/g)];
        const urlMatches = [...html.matchAll(/<a class="result__url[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
        const titleMatches = [...html.matchAll(/<a class="result__title[^>]*>([\s\S]*?)<\/a>/g)];

        for (let i = 0; i < snippetMatches.length; i++) {
          if (results.length >= maxResults) break;

          const rawSnippet = snippetMatches[i]?.[1] || "";
          const rawTitle = titleMatches[i]?.[1] || "";
          let rawUrl = urlMatches[i]?.[1] || "";

          // Decode DuckDuckGo redirect url uddg=
          if (rawUrl.includes("uddg=")) {
            const match = rawUrl.match(/uddg=([^&]+)/);
            if (match) rawUrl = decodeURIComponent(match[1]);
          }

          const cleanTitle = rawTitle.replace(/<[^>]+>/g, "").trim();
          const cleanSnippet = rawSnippet.replace(/<[^>]+>/g, "").trim();

          if (cleanSnippet && rawUrl.startsWith("http")) {
            try {
              const domain = new URL(rawUrl).hostname.replace(/^www\./, "");
              if (!results.some((r) => r.url === rawUrl)) {
                results.push({
                  title: cleanTitle || cleanQuery,
                  url: rawUrl,
                  snippet: cleanSnippet,
                  sourceDomain: domain,
                  authorityTier: categorizeAuthority(domain, rawUrl),
                });
              }
            } catch {}
          }
        }
      }
    } catch {
      // Finished HTML attempt
    }
  }

  // Sort results by authority tier (official > academic > established > secondary)
  const tierWeights: Record<SourceAuthorityTier, number> = {
    official_doc: 4,
    academic_gov: 3,
    established_pub: 2,
    secondary: 1,
  };

  return results.sort((a, b) => tierWeights[b.authorityTier] - tierWeights[a.authorityTier]).slice(0, maxResults);
}

/**
 * Safely fetches and extracts text from an accessible webpage with SSRF prevention
 */
export async function fetchAndExtractWebpage(url: string, timeoutMs: number = 7000): Promise<ExtractedPageContent> {
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.toLowerCase();

    // SSRF Guard: reject internal network, localhost, and non-http protocols
    if (
      parsed.protocol !== "http:" &&
      parsed.protocol !== "https:" ||
      domain === "localhost" ||
      domain === "127.0.0.1" ||
      domain === "::1" ||
      domain.startsWith("192.168.") ||
      domain.startsWith("10.") ||
      domain.startsWith("172.")
    ) {
      return {
        url,
        domain,
        title: "",
        textSnippet: "",
        fullLength: 0,
        authorityTier: "secondary",
        isAccessible: false,
        error: "Access to private or local network resources is strictly prohibited.",
      };
    }

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 TattvaAI/2.0",
        Accept: "text/html,application/xhtml+xml,text/plain",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      return {
        url,
        domain,
        title: "",
        textSnippet: "",
        fullLength: 0,
        authorityTier: categorizeAuthority(domain, url),
        isAccessible: false,
        error: `HTTP error ${res.status}: ${res.statusText}`,
      };
    }

    const html = await res.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : domain;

    // Extract publication date
    let publishedDate: string | undefined;
    const dateMatch =
      html.match(/<meta[^>]+property=["'](?:article:published_time|og:published_time)["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+name=["'](?:publishdate|date|dc\.date)["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<time[^>]*datetime=["']([^"']+)["']/i);
    if (dateMatch && dateMatch[1]) {
      publishedDate = dateMatch[1].trim();
    }

    // Strip scripts, styles, iframes, navigation, SVGs, head
    const cleanBody = html
      .replace(/<head[\s\S]*?<\/head>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      .replace(/<svg[\s\S]*?<\/svg>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return {
      url,
      domain,
      title,
      publishedDate,
      textSnippet: cleanBody.slice(0, 3000),
      fullLength: cleanBody.length,
      authorityTier: categorizeAuthority(domain, url),
      isAccessible: true,
    };
  } catch (err: any) {
    return {
      url,
      domain: "unknown",
      title: "",
      textSnippet: "",
      fullLength: 0,
      authorityTier: "secondary",
      isAccessible: false,
      error: err?.message || String(err),
    };
  }
}

/**
 * Conducts multi-source comparative research, reading top pages and aggregating facts
 */
export async function conductDeepResearch(
  query: string,
  maxSources: number = 3
): Promise<{
  query: string;
  sources: ExtractedPageContent[];
  synthesisContext: string;
}> {
  const searchResults = await performWebSearch(query, maxSources);
  const pagePromises = searchResults.map((r) => fetchAndExtractWebpage(r.url, 6000));
  const pages = await Promise.all(pagePromises);

  const validPages = pages.filter((p) => p.isAccessible && p.textSnippet.length > 50);

  const contextBlocks: string[] = [];
  for (const page of validPages) {
    contextBlocks.push(
      `[SOURCE: ${page.title} (${page.domain}) | Tier: ${page.authorityTier}${page.publishedDate ? ` | Date: ${page.publishedDate}` : ""}]:\n` +
        `URL: ${page.url}\n` +
        `EXCERPT: ${page.textSnippet.slice(0, 800)}\n`
    );
  }

  return {
    query,
    sources: validPages,
    synthesisContext: contextBlocks.join("\n---\n"),
  };
}

export const webSearchTool: ToolDefinition = {
  name: "web_search",
  displayName: "Live Web Search & Deep Research",
  description:
    "Search authoritative web documentation, retrieve live webpage contents, verify publication dates, and extract facts without fabrication.",
  category: "search",
  riskLevel: "safe",
  parameters: {
    query: {
      type: "string",
      description: "Search keywords or question",
      required: true,
    },
    maxResults: {
      type: "number",
      description: "Maximum citations to return (default: 4)",
      required: false,
      default: 4,
    },
    deepRead: {
      type: "boolean",
      description: "Whether to fetch and extract full text from the highest-authority result pages",
      required: false,
      default: false,
    },
  },
  execute: async (params: Record<string, any>, context: ExecutionContext): Promise<ToolExecutionResult> => {
    const startTime = Date.now();
    const query = String(params.query || "");
    const limit = Number(params.maxResults) || 4;
    const deepRead = Boolean(params.deepRead);

    try {
      if (deepRead) {
        const research = await conductDeepResearch(query, limit);
        return {
          toolName: "web_search",
          success: research.sources.length > 0,
          output: {
            query,
            sourcesCount: research.sources.length,
            sources: research.sources.map((s) => ({
              title: s.title,
              url: s.url,
              domain: s.domain,
              tier: s.authorityTier,
              publishedDate: s.publishedDate,
            })),
            evidenceText: research.synthesisContext,
          },
          executionTimeMs: Date.now() - startTime,
        };
      }

      const items = await performWebSearch(query, limit);
      return {
        toolName: "web_search",
        success: items.length > 0,
        output: {
          query,
          citationsCount: items.length,
          citations: items,
        },
        executionTimeMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        toolName: "web_search",
        success: false,
        output: null,
        error: err?.message || String(err),
        executionTimeMs: Date.now() - startTime,
      };
    }
  },
};
