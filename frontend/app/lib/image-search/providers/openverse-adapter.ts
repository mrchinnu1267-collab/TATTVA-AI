/**
 * Openverse Image Provider Adapter
 * Official API: https://api.openverse.org/v1/images/
 * Completely free, open-source Creative Commons search engine
 */

import { ImageProviderAdapter, ImageSearchResultItem, SearchQueryOptions } from "../types";

export class OpenverseAdapter implements ImageProviderAdapter {
  readonly id = "openverse" as const;
  readonly name = "Openverse (Creative Commons)";

  async search(options: SearchQueryOptions): Promise<{ results: ImageSearchResultItem[]; total: number }> {
    const { query, page = 1, pageSize = 20, filters } = options;
    const cleanQuery = query.trim();
    if (!cleanQuery) return { results: [], total: 0 };

    const params = new URLSearchParams();
    params.set("q", cleanQuery);
    params.set("page", String(page));
    params.set("page_size", String(Math.min(pageSize, 50)));

    // Apply Orientation filter
    if (filters?.orientation === "landscape") {
      params.set("aspect_ratio", "wide");
    } else if (filters?.orientation === "portrait") {
      params.set("aspect_ratio", "tall");
    } else if (filters?.orientation === "square") {
      params.set("aspect_ratio", "square");
    }

    // Apply Type / Category filter
    if (filters?.type === "photograph") {
      params.set("categories", "photograph");
    } else if (filters?.type === "illustration") {
      params.set("categories", "illustration");
    }

    // Apply Size filter
    if (filters?.size === "small") {
      params.set("size", "small");
    } else if (filters?.size === "medium") {
      params.set("size", "medium");
    } else if (filters?.size === "large") {
      params.set("size", "large");
    }

    const apiUrl = `https://api.openverse.org/v1/images/?${params.toString()}`;

    try {
      const res = await fetch(apiUrl, {
        headers: {
          "User-Agent": "TattvaAI/2.0 (OpenImageEngine; +https://tattva-ai-phi.vercel.app)",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        console.warn(`[OpenverseAdapter] HTTP ${res.status}: ${res.statusText}`);
        return { results: [], total: 0 };
      }

      const data = await res.json();
      const rawResults = Array.isArray(data.results) ? data.results : [];
      const total = Number(data.result_count) || rawResults.length;

      const normalized: ImageSearchResultItem[] = rawResults.map((item: any) => {
        let sourceDomain = "Openverse";
        if (item.foreign_landing_url) {
          try {
            sourceDomain = new URL(item.foreign_landing_url).hostname.replace("www.", "");
          } catch {}
        } else if (item.source) {
          sourceDomain = item.source;
        }

        const width = item.width ? Number(item.width) : undefined;
        const height = item.height ? Number(item.height) : undefined;
        const aspectRatio = width && height ? width / height : undefined;

        return {
          id: `ov_${item.id}`,
          title: item.title || cleanQuery,
          url: item.url,
          thumbnail: item.thumbnail || item.url,
          source: sourceDomain,
          sourceUrl: item.foreign_landing_url || item.url,
          creator: item.creator || undefined,
          creatorUrl: item.creator_url || undefined,
          license: item.license ? String(item.license).toUpperCase() : undefined,
          licenseUrl: item.license_url || undefined,
          width,
          height,
          aspectRatio,
          provider: "openverse",
          tags: Array.isArray(item.tags) ? item.tags.map((t: any) => t.name || String(t)).slice(0, 5) : [],
        };
      });

      return { results: normalized, total };
    } catch (err) {
      console.warn("[OpenverseAdapter] Request error:", err);
      return { results: [], total: 0 };
    }
  }
}

