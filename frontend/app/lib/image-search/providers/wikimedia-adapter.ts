/**
 * Wikimedia Commons Image Provider Adapter
 * Official API: https://commons.wikimedia.org/w/api.php
 * Official documentation: https://www.mediawiki.org/wiki/API:Main_page
 * The world's largest public domain & Creative Commons multimedia repository
 */

import { ImageProviderAdapter, ImageSearchResultItem, SearchQueryOptions } from "../types";

export class WikimediaAdapter implements ImageProviderAdapter {
  readonly id = "wikimedia" as const;
  readonly name = "Wikimedia Commons";

  async search(options: SearchQueryOptions): Promise<{ results: ImageSearchResultItem[]; total: number }> {
    const { query, page = 1, pageSize = 20, filters } = options;
    const cleanQuery = query.trim();
    if (!cleanQuery) return { results: [], total: 0 };

    // Craft search query including type if needed
    let searchQuery = cleanQuery;
    if (filters?.type === "photograph" && !searchQuery.toLowerCase().includes("photo")) {
      searchQuery += " photo";
    } else if (filters?.type === "illustration" && !searchQuery.toLowerCase().includes("illustration")) {
      searchQuery += " illustration";
    }

    const offset = Math.max(0, (page - 1) * pageSize);
    const limit = Math.min(pageSize, 50);

    const params = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: searchQuery,
      gsrnamespace: "6", // File namespace in Wikimedia Commons
      gsroffset: String(offset),
      gsrlimit: String(limit),
      prop: "pageimages|imageinfo|info",
      iiprop: "url|size|extmetadata|mime",
      piprop: "thumbnail|original",
      pithumbsize: "640",
      inprop: "url",
      format: "json",
      origin: "*",
    });

    const apiUrl = `https://commons.wikimedia.org/w/api.php?${params.toString()}`;

    try {
      const res = await fetch(apiUrl, {
        headers: {
          "User-Agent": "TattvaAI/2.0 (WikimediaImageEngine; +https://tattva-ai-phi.vercel.app)",
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        console.warn(`[WikimediaAdapter] HTTP ${res.status}: ${res.statusText}`);
        return { results: [], total: 0 };
      }

      const data = await res.json();
      const pages = Object.values(data.query?.pages || {}) as any[];
      const total = pages.length;

      const normalized: ImageSearchResultItem[] = [];

      for (const pageItem of pages) {
        const imgInfo = pageItem.imageinfo?.[0];
        const originalUrl = pageItem.original?.source || imgInfo?.url;
        const thumbnailUrl = pageItem.thumbnail?.source || originalUrl;

        // Skip non-image or missing media
        if (!thumbnailUrl || !originalUrl) continue;
        const mime = imgInfo?.mime || "";
        if (mime && !mime.startsWith("image/")) continue;
        if (originalUrl.endsWith(".svg") || originalUrl.endsWith(".ogg") || originalUrl.endsWith(".pdf")) continue;

        // Extract metadata
        const meta = imgInfo?.extmetadata || {};
        const artistRaw = meta.Artist?.value || meta.Credit?.value || "";
        const cleanArtist = artistRaw ? artistRaw.replace(/<[^>]+>/g, "").trim().slice(0, 50) : undefined;
        const license = meta.LicenseShortName?.value || meta.UsageTerms?.value || "Creative Commons";
        const licenseUrl = meta.LicenseUrl?.value || undefined;

        const width = pageItem.original?.width || imgInfo?.width || pageItem.thumbnail?.width;
        const height = pageItem.original?.height || imgInfo?.height || pageItem.thumbnail?.height;
        const aspectRatio = width && height ? width / height : undefined;

        // Orientation filter check
        if (filters?.orientation === "landscape" && aspectRatio && aspectRatio <= 1.1) continue;
        if (filters?.orientation === "portrait" && aspectRatio && aspectRatio >= 0.9) continue;
        if (filters?.orientation === "square" && aspectRatio && (aspectRatio < 0.85 || aspectRatio > 1.15)) continue;

        // Size filter check
        if (filters?.size === "large" && width && width < 1200) continue;
        if (filters?.size === "small" && width && width > 800) continue;

        // Clean page title (removes "File:" prefix and file extension)
        const cleanTitle = pageItem.title
          ? pageItem.title.replace(/^File:/i, "").replace(/\.[a-zA-Z0-9]+$/, "").replace(/_/g, " ")
          : cleanQuery;

        normalized.push({
          id: `wm_${pageItem.pageid}`,
          title: cleanTitle,
          url: originalUrl,
          thumbnail: thumbnailUrl,
          source: "commons.wikimedia.org",
          sourceUrl: pageItem.fullurl || `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(pageItem.title)}`,
          creator: cleanArtist,
          license: String(license),
          licenseUrl,
          width,
          height,
          aspectRatio,
          provider: "wikimedia",
          tags: [cleanQuery],
        });
      }

      return { results: normalized, total: normalized.length };
    } catch (err) {
      console.warn("[WikimediaAdapter] Request error:", err);
      return { results: [], total: 0 };
    }
  }
}

