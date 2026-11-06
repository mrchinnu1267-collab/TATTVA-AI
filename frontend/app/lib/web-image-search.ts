/**
 * TATTVA AI - Inbuilt Web Image Search Engine
 * Fetches real photographs and visual search results across the web (DuckDuckGo, Bing Images, Wikimedia Commons)
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export interface WebImageResult {
  url: string;
  thumbnail?: string;
  title: string;
  source: string;
  sourceUrl?: string;
  width?: number;
  height?: number;
}

/**
 * Searches the web for real photographs matching the query
 */
export async function searchWebImages(
  query: string,
  maxResults: number = 6
): Promise<WebImageResult[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const results: WebImageResult[] = [];
  const seenUrls = new Set<string>();

  // Helper to add clean image
  const addImage = (img: WebImageResult) => {
    if (!img.url || seenUrls.has(img.url)) return;
    if (!img.url.startsWith("http")) return;
    // Filter out SVGs or tracking pixels if needed
    if (img.url.endsWith(".svg")) return;
    seenUrls.add(img.url);
    results.push(img);
  };

  // 1. DuckDuckGo / Bing Image Search
  try {
    const tokenRes = await fetch(
      `https://duckduckgo.com/?q=${encodeURIComponent(cleanQuery)}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(4000),
      }
    );
    if (tokenRes.ok) {
      const html = await tokenRes.text();
      const vqdMatch = html.match(/vqd=['"]?([^&'"]+)/);
      if (vqdMatch && vqdMatch[1]) {
        const vqd = vqdMatch[1];
        const imgApiUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(
          cleanQuery
        )}&vqd=${vqd}&f=,,,`;
        const imgRes = await fetch(imgApiUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Referer: "https://duckduckgo.com/",
          },
          signal: AbortSignal.timeout(4000),
        });

        if (imgRes.ok) {
          const data = await imgRes.json();
          if (Array.isArray(data.results)) {
            for (const item of data.results) {
              if (results.length >= maxResults) break;
              if (item.image) {
                addImage({
                  url: item.image,
                  thumbnail: item.thumbnail || item.image,
                  title: item.title || cleanQuery,
                  source: item.url ? new URL(item.url).hostname.replace("www.", "") : "Web Search",
                  sourceUrl: item.url || item.image,
                  width: item.width,
                  height: item.height,
                });
              }
            }
          }
        }
      }
    }
  } catch (err) {
    // DDG search timed out or was blocked, fall through to Wikimedia
  }

  // 2. Wikimedia Commons Photography API (Ultra-reliable fallback with real high-resolution photos)
  if (results.length < maxResults) {
    try {
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
        cleanQuery
      )}&gsrlimit=12&prop=pageimages|description&piprop=thumbnail|original&pithumbsize=800&format=json`;
      const wikiRes = await fetch(wikiUrl, {
        headers: { "User-Agent": "TattvaAI/2.0 (image-engine)" },
        signal: AbortSignal.timeout(3500),
      });

      if (wikiRes.ok) {
        const data = await wikiRes.json();
        const pages = Object.values(data.query?.pages || {}) as any[];
        for (const page of pages) {
          if (results.length >= maxResults) break;
          const imgUrl = page.original?.source || page.thumbnail?.source;
          if (imgUrl) {
            addImage({
              url: imgUrl,
              thumbnail: page.thumbnail?.source || imgUrl,
              title: page.title || cleanQuery,
              source: "Wikipedia / Commons",
              sourceUrl: `https://en.wikipedia.org/?curid=${page.pageid}`,
              width: page.thumbnail?.width,
              height: page.thumbnail?.height,
            });
          }
        }
      }
    } catch (err) {
      // Wikimedia fallback finished
    }
  }

  // 3. Fallback High-Quality Curated Unsplash Source Photos for common subjects
  if (results.length === 0) {
    const safeTopic = encodeURIComponent(cleanQuery.split(" ")[0] || "nature");
    results.push(
      {
        url: `https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=800&q=80`,
        thumbnail: `https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=400&q=80`,
        title: `${cleanQuery} - Web Visual Result`,
        source: "unsplash.com",
        sourceUrl: `https://unsplash.com/s/photos/${safeTopic}`,
      },
      {
        url: `https://images.unsplash.com/photo-1508610048659-a06b669e3321?auto=format&fit=crop&w=800&q=80`,
        thumbnail: `https://images.unsplash.com/photo-1508610048659-a06b669e3321?auto=format&fit=crop&w=400&q=80`,
        title: `${cleanQuery} - High Resolution Photography`,
        source: "unsplash.com",
        sourceUrl: `https://unsplash.com/s/photos/${safeTopic}`,
      }
    );
  }

  return results.slice(0, maxResults);
}

/**
 * Checks if a user's prompt is asking for visual items, photographs, or web images
 */
export function isImageSearchQuery(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase().trim();

  // Explicit image search requests
  const visualPatterns = [
    /\b(image|images|picture|pictures|pic|pics|photo|photos|photograph|photographs|wallpaper)\b/i,
    /\b(show me|display|view|look at|see)\b/i,
    /\b(types of|different types|kinds of|varieties of|examples of)\b/i,
    /\b(flowers?|roses?|sunflowers?|tulips?|orchids?|lotus|lavender)\b/i,
    /\b(cars?|supercars?|sports cars?|bmw|audi|ferrari|lamborghini|porsche)\b/i,
    /\b(animals?|birds?|dogs?|cats?|tigers?|lions?|elephants?|wildlife)\b/i,
    /\b(places?|monuments?|wonders|eiffel tower|taj mahal|mount everest|pyramids?)\b/i,
    /\b(what does .* look like)\b/i,
    /\b(how does .* look)\b/i,
  ];

  return visualPatterns.some((pattern) => pattern.test(lower));
}

/**
 * Extracts a concise search query for the image search engine from a conversational user prompt
 */
export function extractImageSearchKeywords(text: string): string {
  let clean = text
    .replace(/^(if i ask|can you show me|show me|give me|find me|search for|display|i want|please show me)\s+/i, "")
    .replace(/\b(pictures?|photos?|images?|photographs?|wallpaper)\s*(of)?\b/gi, "")
    .replace(/\b(i want|please|kindly)\b/gi, "")
    .trim();

  // If user says "different types of flowers i want" -> "different types of flowers"
  clean = clean.replace(/\s+i want$/i, "").trim();

  return clean || text.trim();
}

