import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const mode = searchParams.get("mode") || "satellite";

  if (!q.trim()) {
    return NextResponse.json(
      {
        message: "TATTVA Real Satellite & Interactive Map API",
        endpoints: {
          search: "/api/map?q={place_name}&mode=satellite",
          tile: "/api/map/tile?z={z}&x={x}&y={y}&mode=satellite",
          geocode: "/api/geocode?q={place_name}",
        },
        supportedModes: ["satellite", "roadmap"],
      },
      { status: 200 }
    );
  }

  try {
    // 1. Check if coordinates were passed directly: e.g. "12.9716, 77.5946"
    const coordMatch = q.trim().match(/^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[3]);

      // Calculate approximate tile coordinates at zoom 15
      const zoom = 15;
      const n = Math.pow(2, zoom);
      const radLat = (lat * Math.PI) / 180;
      const tileX = Math.floor(((lng + 180) / 360) * n);
      const tileY = Math.floor(
        ((1 - Math.log(Math.tan(radLat) + 1 / Math.cos(radLat)) / Math.PI) / 2) * n
      );

      return NextResponse.json({
        success: true,
        query: q.trim(),
        lat,
        lng,
        zoom,
        mode,
        displayName: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        satelliteTileUrl: `/api/map/tile?z=${zoom}&x=${tileX}&y=${tileY}&mode=satellite`,
        tileTemplate: `/api/map/tile?z={z}&x={x}&y={y}&mode=${mode}`,
        googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      });
    }

    // 2. Geocode place query using Nominatim service
    const geocodeRes = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(
        q.trim()
      )}`,
      {
        headers: {
          "User-Agent": "TattvaAI-MapAPI/1.0 (mr.chinnu1267@gmail.com)",
          Accept: "application/json",
        },
      }
    );

    if (!geocodeRes.ok) {
      throw new Error(`Geocoding failed with status ${geocodeRes.status}`);
    }

    const data = await geocodeRes.json();
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `No locations found for "${q}"`,
          results: [],
        },
        { status: 404 }
      );
    }

    const top = data[0];
    const lat = parseFloat(top.lat);
    const lng = parseFloat(top.lon);
    const zoom = 15;
    const n = Math.pow(2, zoom);
    const radLat = (lat * Math.PI) / 180;
    const tileX = Math.floor(((lng + 180) / 360) * n);
    const tileY = Math.floor(
      ((1 - Math.log(Math.tan(radLat) + 1 / Math.cos(radLat)) / Math.PI) / 2) * n
    );

    return NextResponse.json({
      success: true,
      query: q.trim(),
      lat,
      lng,
      zoom,
      mode,
      displayName: top.display_name,
      type: top.type,
      importance: top.importance,
      boundingBox: top.boundingbox,
      satelliteTileUrl: `/api/map/tile?z=${zoom}&x=${tileX}&y=${tileY}&mode=satellite`,
      tileTemplate: `/api/map/tile?z={z}&x={x}&y={y}&mode=${mode}`,
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        top.display_name
      )}`,
      allMatches: data.slice(0, 5).map((item: any) => ({
        displayName: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        type: item.type,
      })),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Map API internal error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

