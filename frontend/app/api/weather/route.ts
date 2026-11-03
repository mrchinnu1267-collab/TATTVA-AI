import { NextResponse } from "next/server";
import { getWeatherReport } from "../../lib/weather-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { latitude, longitude, city, query } = body;

    const weather = await getWeatherReport({
      latitude: typeof latitude === "number" ? latitude : undefined,
      longitude: typeof longitude === "number" ? longitude : undefined,
      city: typeof city === "string" ? city : undefined,
      userQuery: typeof query === "string" ? query : undefined,
    });

    if (!weather) {
      return NextResponse.json(
        { success: false, error: "Could not retrieve weather for the specified location." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      weather,
      summary: weather.summaryText,
      spokenText: weather.spokenSummary,
      location: weather.location,
    });
  } catch (error: unknown) {
    console.error("[API Weather] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const latStr = searchParams.get("lat");
    const lonStr = searchParams.get("lon");
    const city = searchParams.get("city") || undefined;
    const query = searchParams.get("q") || undefined;

    const latitude = latStr ? parseFloat(latStr) : undefined;
    const longitude = lonStr ? parseFloat(lonStr) : undefined;

    const weather = await getWeatherReport({
      latitude: !isNaN(latitude!) ? latitude : undefined,
      longitude: !isNaN(longitude!) ? longitude : undefined,
      city,
      userQuery: query,
    });

    if (!weather) {
      return NextResponse.json(
        { success: false, error: "Could not retrieve weather." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      weather,
      summary: weather.summaryText,
      spokenText: weather.spokenSummary,
      location: weather.location,
    });
  } catch (error: unknown) {
    console.error("[API Weather GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
