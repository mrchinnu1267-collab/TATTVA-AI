import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface AreaPhoto {
  title: string;
  url: string;
  source: "wikipedia" | "google_maps_web" | "wikimedia";
  thumbnail?: string;
  description?: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng") || searchParams.get("lon");

  const lat = latParam ? parseFloat(latParam) : null;
  const lng = lngParam ? parseFloat(lngParam) : null;

  try {
    const photos: AreaPhoto[] = [];
    const seenUrls = new Set<string>();

    const cleanQuery = q.replace(/["']/g, "").trim();

    // 1. Wikipedia Geosearch around coordinates (finds actual landmark images within 10km)
    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
      try {
        const geoUrl = `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lng}&gsradius=10000&gslimit=10&format=json`;
        const geoRes = await fetch(geoUrl, {
          headers: { "User-Agent": "TattvaAI-AreaPhotos/1.0 (mr.chinnu1267@gmail.com)" },
          signal: AbortSignal.timeout(3000),
        });

        if (geoRes.ok) {
          const geoData = await geoRes.json();
          const pageIds = (geoData.query?.geosearch || []).map((p: any) => p.pageid).join("|");

          if (pageIds) {
            const imgUrl = `https://en.wikipedia.org/w/api.php?action=query&pageids=${pageIds}&prop=pageimages|description&pithumbsize=1200&format=json`;
            const imgRes = await fetch(imgUrl, {
              headers: { "User-Agent": "TattvaAI-AreaPhotos/1.0" },
              signal: AbortSignal.timeout(3000),
            });

            if (imgRes.ok) {
              const imgData = await imgRes.json();
              const pages = Object.values(imgData.query?.pages || {}) as any[];

              for (const page of pages) {
                const src = page.thumbnail?.source;
                if (src && !seenUrls.has(src)) {
                  seenUrls.add(src);
                  photos.push({
                    title: page.title || "Area Landmark",
                    url: src,
                    source: "wikipedia",
                    description: page.description || `Historic landmark near coordinates ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                  });
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn("Wiki geosearch error:", err);
      }
    }

    // 2. Wikipedia Search by place name / area name
    if (cleanQuery) {
      try {
        const wikiSearchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
          cleanQuery
        )}&gsrlimit=8&prop=pageimages|description&pithumbsize=1200&format=json`;

        const wikiRes = await fetch(wikiSearchUrl, {
          headers: { "User-Agent": "TattvaAI-AreaPhotos/1.0" },
          signal: AbortSignal.timeout(3000),
        });

        if (wikiRes.ok) {
          const wikiData = await wikiRes.json();
          const pages = Object.values(wikiData.query?.pages || {}) as any[];

          for (const page of pages) {
            const src = page.thumbnail?.source;
            if (src && !seenUrls.has(src)) {
              seenUrls.add(src);
              photos.push({
                title: page.title || cleanQuery,
                url: src,
                source: "wikimedia",
                description: page.description || `Area view of ${cleanQuery}`,
              });
            }
          }
        }
      } catch (err) {
        console.warn("Wiki text search error:", err);
      }
    }

    // 3. Web photo search for authentic street views and cityscapes
    if (cleanQuery && photos.length < 10) {
      try {
        const tokenRes = await fetch(
          `https://duckduckgo.com/?q=${encodeURIComponent(cleanQuery + " aerial photography street view")}&iax=images&ia=images`,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
            signal: AbortSignal.timeout(3000),
          }
        );

        if (tokenRes.ok) {
          const html = await tokenRes.text();
          const match = html.match(/vqd=([0-9-]+)/);
          if (match && match[1]) {
            const vqd = match[1];
            const imgRes = await fetch(
              `https://duckduckgo.com/i.js?l=wt-wt&o=json&q=${encodeURIComponent(
                cleanQuery + " aerial photography street view"
              )}&vqd=${vqd}`,
              {
                headers: {
                  "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                  Referer: "https://duckduckgo.com/",
                },
                signal: AbortSignal.timeout(3000),
              }
            );

            if (imgRes.ok) {
              const imgData = await imgRes.json();
              if (Array.isArray(imgData.results)) {
                for (const r of imgData.results.slice(0, 8)) {
                  if (r.image && (r.image.startsWith("http://") || r.image.startsWith("https://"))) {
                    if (!seenUrls.has(r.image)) {
                      seenUrls.add(r.image);
                      photos.push({
                        title: r.title ? r.title.replace(/<[^>]+>/g, "").trim() : `${cleanQuery} Aerial View`,
                        url: r.image,
                        source: "google_maps_web",
                        description: `Actual scenery and street views of ${cleanQuery}`,
                      });
                    }
                  }
                  if (photos.length >= 15) break;
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn("Area photo search error:", err);
      }
    }

    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      cleanQuery || (lat && lng ? `${lat},${lng}` : "world")
    )}`;

    const googleEarthUrl = `https://earth.google.com/web/search/${encodeURIComponent(
      cleanQuery || (lat && lng ? `${lat},${lng}` : "world")
    )}`;

    return NextResponse.json({
      success: true,
      query: cleanQuery,
      coordinates: lat !== null && lng !== null ? { lat, lng } : null,
      totalPhotos: photos.length,
      photos,
      googleMapsUrl,
      googleEarthUrl,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Error fetching area photos";
    return NextResponse.json({ success: false, error: errorMsg, photos: [] }, { status: 500 });
  }
}

