import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const z = searchParams.get("z");
  const x = searchParams.get("x");
  const y = searchParams.get("y");
  const mode = searchParams.get("mode") || "satellite";

  if (!z || !x || !y) {
    return NextResponse.json(
      { error: "Missing required tile coordinates (z, x, y)" },
      { status: 400 }
    );
  }

  // Random subdomain for balanced high-throughput requests
  const sub = Math.floor(Math.random() * 4);

  if (mode === "satellite") {
    // 1. Primary: Google Maps Satellite Hybrid (real satellite imagery with crisp road labels)
    try {
      const googleSatelliteUrl = `https://mt${sub}.google.com/vt/lyrs=y&x=${x}&y=${y}&z=${z}`;
      const res = await fetch(googleSatelliteUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
        cache: "force-cache",
      });

      if (res.ok) {
        const buffer = await res.arrayBuffer();
        const contentType = res.headers.get("content-type") || "image/jpeg";
        return new Response(buffer, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=604800, stale-while-revalidate=2592000, immutable",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
    } catch {
      // Fallback to ESRI World Imagery below
    }

    // 2. Secondary Fallback: ESRI ArcGIS World Imagery (real global satellite view)
    try {
      const esriUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
      const res = await fetch(esriUrl, {
        headers: {
          "User-Agent": "TattvaAI-MapEngine/1.0",
          Accept: "image/*,*/*",
        },
        cache: "force-cache",
      });

      if (res.ok) {
        const buffer = await res.arrayBuffer();
        const contentType = res.headers.get("content-type") || "image/jpeg";
        return new Response(buffer, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=604800, stale-while-revalidate=2592000, immutable",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
    } catch {
      // Return 404 or empty tile
    }
  } else {
    // Roadmap Mode: Google Vector Roadmap with OpenStreetMap fallback
    try {
      const googleRoadmapUrl = `https://mt${sub}.google.com/vt/lyrs=m&x=${x}&y=${y}&z=${z}`;
      const res = await fetch(googleRoadmapUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "image/*,*/*",
        },
        cache: "force-cache",
      });

      if (res.ok) {
        const buffer = await res.arrayBuffer();
        const contentType = res.headers.get("content-type") || "image/png";
        return new Response(buffer, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=604800, stale-while-revalidate=2592000, immutable",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
    } catch {
      // Fallback to OSM
    }

    try {
      const osmUrl = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
      const res = await fetch(osmUrl, {
        headers: {
          "User-Agent": "TattvaAI-MapEngine/1.0 (mr.chinnu1267@gmail.com)",
        },
        cache: "force-cache",
      });

      if (res.ok) {
        const buffer = await res.arrayBuffer();
        return new Response(buffer, {
          status: 200,
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=604800, stale-while-revalidate=2592000, immutable",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
    } catch {
      // Empty tile
    }
  }

  // 1x1 transparent GIF fallback to prevent broken images
  const emptyPixel = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "base64"
  );
  return new Response(emptyPixel, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-cache",
    },
  });
}

