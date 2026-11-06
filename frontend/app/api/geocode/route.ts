import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon") || searchParams.get("lng");

  // 1. Reverse Geocoding by coordinates
  if (lat && lon) {
    try {
      // Nominatim reverse lookup
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(
          lat
        )}&lon=${encodeURIComponent(lon)}`,
        {
          headers: {
            "User-Agent": "TattvaAI-Geocode/1.0 (mr.chinnu1267@gmail.com)",
            Accept: "application/json",
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        const city =
          data.address?.city ||
          data.address?.town ||
          data.address?.village ||
          data.address?.suburb ||
          data.address?.county ||
          "";
        return NextResponse.json(
          {
            city: city,
            displayName: data.display_name,
            address: data.address,
          },
          {
            headers: {
              "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
            },
          }
        );
      }
    } catch {
      // Fallback to BigDataCloud server-side
    }

    try {
      const bdcRes = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(
          lat
        )}&longitude=${encodeURIComponent(lon)}&localityLanguage=en`,
        { headers: { "User-Agent": "TattvaAI-Geocode/1.0" } }
      );
      if (bdcRes.ok) {
        const bdcData = await bdcRes.json();
        const city = bdcData.city || bdcData.locality || bdcData.principalSubdivision || "";
        return NextResponse.json({
          city: city,
          displayName: `${city}, ${bdcData.countryName || ""}`,
          data: bdcData,
        });
      }
    } catch {
      // Fallback
    }

    return NextResponse.json({
      city: `${parseFloat(lat).toFixed(2)}, ${parseFloat(lon).toFixed(2)}`,
      displayName: `${lat}, ${lon}`,
    });
  }

  // 2. Forward Geocoding by Place Name query
  if (!q.trim()) {
    return NextResponse.json({ error: "Missing query parameter 'q' or 'lat'/'lon'" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q.trim())}`,
      {
        headers: {
          "User-Agent": "TattvaAI-Geocode/1.0 (mr.chinnu1267@gmail.com)",
          Accept: "application/json",
        },
      }
    );

    if (!res.ok) {
      throw new Error(`Geocoding failed with status ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(
      { results: data },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Geocode service error";
    return NextResponse.json({ error: msg, results: [] }, { status: 500 });
  }
}
