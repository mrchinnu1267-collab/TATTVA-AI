export interface WeatherData {
  location: {
    city: string;
    region?: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  current: {
    temperature: number; // Celsius
    temperatureFahrenheit: number;
    feelsLike: number;
    humidity: number; // percentage
    windSpeed: number; // km/h
    precipitation: number; // mm
    isDay: boolean;
    weatherCode: number;
    conditionText: string;
    conditionEmoji: string;
    time: string;
  };
  daily: {
    tempMax: number;
    tempMin: number;
    tempMaxF: number;
    tempMinF: number;
    weatherCode: number;
    conditionText: string;
  };
  forecast?: Array<{
    date: string;
    tempMax: number;
    tempMin: number;
    conditionText: string;
    conditionEmoji: string;
  }>;
  summaryText: string;
  spokenSummary: string;
}

export interface WeatherRequestOptions {
  latitude?: number;
  longitude?: number;
  city?: string;
  userQuery?: string;
}

// WMO Weather Interpretation Codes (WW)
const WMO_CODE_MAP: Record<number, { text: string; emoji: string }> = {
  0: { text: "Clear sky", emoji: "☀️" },
  1: { text: "Mainly clear", emoji: "🌤️" },
  2: { text: "Partly cloudy", emoji: "⛅" },
  3: { text: "Overcast", emoji: "☁️" },
  45: { text: "Foggy", emoji: "🌫️" },
  48: { text: "Depositing rime fog", emoji: "🌫️" },
  51: { text: "Light drizzle", emoji: "🌦️" },
  53: { text: "Moderate drizzle", emoji: "🌦️" },
  55: { text: "Dense drizzle", emoji: "🌧️" },
  56: { text: "Light freezing drizzle", emoji: "🌨️" },
  57: { text: "Dense freezing drizzle", emoji: "🌨️" },
  61: { text: "Slight rain", emoji: "🌧️" },
  63: { text: "Moderate rain", emoji: "🌧️" },
  65: { text: "Heavy rain", emoji: "⛈️" },
  66: { text: "Light freezing rain", emoji: "🌨️" },
  67: { text: "Heavy freezing rain", emoji: "🌨️" },
  71: { text: "Slight snow fall", emoji: "🌨️" },
  73: { text: "Moderate snow fall", emoji: "🌨️" },
  75: { text: "Heavy snow fall", emoji: "❄️" },
  77: { text: "Snow grains", emoji: "❄️" },
  80: { text: "Slight rain showers", emoji: "🌦️" },
  81: { text: "Moderate rain showers", emoji: "🌧️" },
  82: { text: "Violent rain showers", emoji: "⛈️" },
  85: { text: "Slight snow showers", emoji: "🌨️" },
  86: { text: "Heavy snow showers", emoji: "❄️" },
  95: { text: "Thunderstorm", emoji: "⛈️" },
  96: { text: "Thunderstorm with slight hail", emoji: "⛈️" },
  99: { text: "Thunderstorm with heavy hail", emoji: "⛈️" },
};

function getCondition(code: number): { text: string; emoji: string } {
  return WMO_CODE_MAP[code] || { text: "Clear weather", emoji: "🌤️" };
}

function cToF(c: number): number {
  return Math.round((c * 9) / 5 + 32);
}

/**
 * Checks if a user prompt is asking for weather information
 */
export function isWeatherQuery(prompt: string): boolean {
  const lower = prompt.toLowerCase().trim();
  const weatherKeywords = [
    "weather",
    "wether", // handle common user typo
    "whether report", // handle phonetic user typo
    "temperature",
    "forecast",
    "rain today",
    "is it raining",
    "will it rain",
    "how hot is it",
    "how cold is it",
    "climate today",
    "humidity today",
    "wind speed",
    "weather report",
    "current weather",
  ];

  return weatherKeywords.some((keyword) => lower.includes(keyword));
}

/**
 * Extract a specific location name from a query (e.g. "weather in Tokyo" -> "Tokyo")
 */
export function extractLocationFromQuery(prompt: string): string | null {
  const lower = prompt.toLowerCase();
  const patterns = [
    /(?:weather|temperature|forecast|climate|rain)\s+(?:in|at|for|around|of)\s+([a-zA-Z\s,.-]+?)(?:\?|$|\.|\!|\s+today|\s+now|\s+tomorrow)/i,
    /(?:in|at|for)\s+([a-zA-Z\s,.-]+?)\s+(?:weather|temperature|forecast)/i,
  ];

  for (const regex of patterns) {
    const match = prompt.match(regex);
    if (match && match[1]) {
      const candidate = match[1].trim();
      const ignoreWords = ["my location", "here", "current location", "today", "now", "this city", "my area"];
      if (!ignoreWords.includes(candidate.toLowerCase()) && candidate.length >= 2 && candidate.length < 50) {
        return candidate;
      }
    }
  }

  return null;
}

/**
 * Geocode a city name using Open-Meteo free geocoding API
 */
async function geocodeCity(cityName: string): Promise<{
  city: string;
  region?: string;
  country: string;
  latitude: number;
  longitude: number;
} | null> {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.results && data.results.length > 0) {
      const best = data.results[0];
      return {
        city: best.name,
        region: best.admin1 || best.country,
        country: best.country || "",
        latitude: best.latitude,
        longitude: best.longitude,
      };
    }
  } catch (err) {
    console.warn("[WeatherService] Geocoding error for city:", cityName, err);
  }
  return null;
}

/**
 * Reverse geocode coordinates to City, Region, Country
 */
async function reverseGeocodeCoords(lat: number, lon: number): Promise<{
  city: string;
  region?: string;
  country: string;
}> {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      const city = data.city || data.locality || data.principalSubdivision || "Your Location";
      const region = data.principalSubdivision || "";
      const country = data.countryName || "";
      return { city, region, country };
    }
  } catch (err) {
    console.warn("[WeatherService] Reverse geocode error:", err);
  }

  return { city: "Your Location", region: "", country: "" };
}

/**
 * Fallback location from IP lookup
 */
async function getIPLocation(): Promise<{
  city: string;
  region?: string;
  country: string;
  latitude: number;
  longitude: number;
} | null> {
  try {
    const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      if (data?.latitude && data?.longitude) {
        return {
          city: data.city || "Your City",
          region: data.region || "",
          country: data.country_name || "",
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
        };
      }
    }
  } catch {
    // try secondary IP fallback if primary fails
    try {
      const res2 = await fetch("https://ip-api.com/json/?fields=status,message,country,regionName,city,lat,lon", { signal: AbortSignal.timeout(4000) });
      if (res2.ok) {
        const data2 = await res2.json();
        if (data2.status === "success" && data2.lat && data2.lon) {
          return {
            city: data2.city || "Your City",
            region: data2.regionName || "",
            country: data2.country || "",
            latitude: Number(data2.lat),
            longitude: Number(data2.lon),
          };
        }
      }
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * Main function: Get comprehensive live weather report
 */
export async function getWeatherReport(options: WeatherRequestOptions): Promise<WeatherData | null> {
  try {
    let resolvedLocation: {
      city: string;
      region?: string;
      country: string;
      latitude: number;
      longitude: number;
    } | null = null;

    // 1. If user asked about a specific location in their query
    const queriedCity = options.city || (options.userQuery ? extractLocationFromQuery(options.userQuery) : null);
    if (queriedCity) {
      resolvedLocation = await geocodeCity(queriedCity);
    }

    // 2. If no specific city queried, use GPS coordinates provided by the user's browser
    if (!resolvedLocation && typeof options.latitude === "number" && typeof options.longitude === "number") {
      const geo = await reverseGeocodeCoords(options.latitude, options.longitude);
      resolvedLocation = {
        city: geo.city,
        region: geo.region,
        country: geo.country,
        latitude: options.latitude,
        longitude: options.longitude,
      };
    }

    // 3. Fallback to IP geolocation if GPS is unavailable
    if (!resolvedLocation) {
      resolvedLocation = await getIPLocation();
    }

    // Default to Hyderabad / General location if all else fails
    if (!resolvedLocation) {
      resolvedLocation = {
        city: "Hyderabad",
        region: "Telangana",
        country: "India",
        latitude: 17.385,
        longitude: 78.4867,
      };
    }

    const { latitude, longitude, city, region, country } = resolvedLocation;

    // 4. Query Open-Meteo for live weather data
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;

    const weatherRes = await fetch(weatherUrl, { signal: AbortSignal.timeout(6000) });
    if (!weatherRes.ok) {
      throw new Error(`Open-Meteo API returned status ${weatherRes.status}`);
    }

    const weatherJson = await weatherRes.json();
    const curr = weatherJson.current;
    const daily = weatherJson.daily;

    const condition = getCondition(curr.weather_code);
    const dailyCondition = getCondition(daily.weather_code[0]);

    const tempC = Math.round(curr.temperature_2m * 10) / 10;
    const tempF = cToF(tempC);
    const feelsLikeC = Math.round(curr.apparent_temperature * 10) / 10;
    const tempMaxC = Math.round(daily.temperature_2m_max[0] * 10) / 10;
    const tempMinC = Math.round(daily.temperature_2m_min[0] * 10) / 10;

    const locationDisplay = [city, region, country].filter(Boolean).join(", ");

    // Prepare 3-day forecast
    const forecastDays: Array<{
      date: string;
      tempMax: number;
      tempMin: number;
      conditionText: string;
      conditionEmoji: string;
    }> = [];

    if (daily?.time && Array.isArray(daily.time)) {
      for (let i = 0; i < Math.min(daily.time.length, 3); i++) {
        const dCond = getCondition(daily.weather_code[i]);
        forecastDays.push({
          date: daily.time[i],
          tempMax: Math.round(daily.temperature_2m_max[i] * 10) / 10,
          tempMin: Math.round(daily.temperature_2m_min[i] * 10) / 10,
          conditionText: dCond.text,
          conditionEmoji: dCond.emoji,
        });
      }
    }

    // Natural spoken summary for Voice Assistant (Sare)
    const spokenSummary = `The current weather in ${city} is ${tempC} degrees Celsius and ${condition.text.toLowerCase()}. Feels like ${feelsLikeC} degrees with ${curr.relative_humidity_2m}% humidity and wind speed of ${curr.wind_speed_10m} kilometers per hour. Today's high is expected to reach ${tempMaxC} degrees with a low of ${tempMinC} degrees.`;

    // Detailed markdown summary for Chat
    const summaryText = `### ${condition.emoji} Current Weather in **${locationDisplay}**

- **Temperature:** **${tempC}°C** (${tempF}°F) • *Feels like ${feelsLikeC}°C*
- **Condition:** **${condition.text}** ${condition.emoji}
- **Humidity:** **${curr.relative_humidity_2m}%**
- **Wind Speed:** **${curr.wind_speed_10m} km/h**
- **Precipitation:** **${curr.precipitation} mm**
- **Today's Forecast:** High: **${tempMaxC}°C** • Low: **${tempMinC}°C**

${
  forecastDays.length > 1
    ? `**Upcoming Days:**\n` +
      forecastDays
        .slice(1)
        .map((f) => `- **${f.date}:** ${f.conditionEmoji} ${f.conditionText} (High: ${f.tempMax}°C, Low: ${f.tempMin}°C)`)
        .join("\n")
    : ""
}`.trim();

    return {
      location: {
        city,
        region,
        country,
        latitude,
        longitude,
      },
      current: {
        temperature: tempC,
        temperatureFahrenheit: tempF,
        feelsLike: feelsLikeC,
        humidity: curr.relative_humidity_2m,
        windSpeed: curr.wind_speed_10m,
        precipitation: curr.precipitation,
        isDay: Boolean(curr.is_day),
        weatherCode: curr.weather_code,
        conditionText: condition.text,
        conditionEmoji: condition.emoji,
        time: curr.time,
      },
      daily: {
        tempMax: tempMaxC,
        tempMin: tempMinC,
        tempMaxF: cToF(tempMaxC),
        tempMinF: cToF(tempMinC),
        weatherCode: daily.weather_code[0],
        conditionText: dailyCondition.text,
      },
      forecast: forecastDays,
      summaryText,
      spokenSummary,
    };
  } catch (error) {
    console.error("[WeatherService] Failed to fetch weather report:", error);
    return null;
  }
}
