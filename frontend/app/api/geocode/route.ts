import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";

  if (!q.trim()) {
    return NextResponse.json({ error: "Missing query parameter 'q'" }, { status: 400 });
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
    return NextResponse.json({ results: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Geocode service error";
    return NextResponse.json({ error: msg, results: [] }, { status: 500 });
  }
}

