/**
 * TATTVA AI - Inbuilt Real-Time Clock & Global Timezone Service
 * Provides exact ground-truth time, interactive clock telemetry & timezone synchronization
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export interface ClockReport {
  currentTime: string;
  currentSeconds: string;
  currentDate: string;
  dayOfWeek: string;
  timeZone: string;
  rawTimeZone: string;
  utcOffset: string;
  timestamp: number;
  targetCity?: string;
  summaryText: string;
}

const CITY_TIMEZONE_MAP: Record<string, string> = {
  london: "Europe/London",
  uk: "Europe/London",
  tokyo: "Asia/Tokyo",
  japan: "Asia/Tokyo",
  "new york": "America/New_York",
  ny: "America/New_York",
  nyc: "America/New_York",
  "los angeles": "America/Los_Angeles",
  la: "America/Los_Angeles",
  california: "America/Los_Angeles",
  "san francisco": "America/Los_Angeles",
  paris: "Europe/Paris",
  france: "Europe/Paris",
  berlin: "Europe/Berlin",
  germany: "Europe/Berlin",
  dubai: "Asia/Dubai",
  uae: "Asia/Dubai",
  singapore: "Asia/Singapore",
  sydney: "Australia/Sydney",
  australia: "Australia/Sydney",
  toronto: "America/Toronto",
  canada: "America/Toronto",
  mumbai: "Asia/Kolkata",
  delhi: "Asia/Kolkata",
  bangalore: "Asia/Kolkata",
  hyderabad: "Asia/Kolkata",
  india: "Asia/Kolkata",
  moscow: "Europe/Moscow",
  russia: "Europe/Moscow",
  beijing: "Asia/Shanghai",
  shanghai: "Asia/Shanghai",
  china: "Asia/Shanghai",
};

/**
 * Checks if a user's prompt is querying the current time, date, day or clock
 */
export function isClockQuery(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase().trim();

  // Explicit time queries
  const clockPatterns = [
    /\b(what('s| is) the time)\b/i,
    /\b(what time is it)\b/i,
    /\b(current time)\b/i,
    /\b(time right now)\b/i,
    /\b(time now)\b/i,
    /\b(tell me the time)\b/i,
    /\b(show me the clock)\b/i,
    /\b(clock)\b/i,
    /\b(what day is today)\b/i,
    /\b(what is today's date)\b/i,
    /\b(current date)\b/i,
    /\b(what is the date today)\b/i,
    /\b(what's today's date)\b/i,
    /\b(time in [a-z\s]+)\b/i,
    /\b(what time in [a-z\s]+)\b/i,
  ];

  return clockPatterns.some((pattern) => pattern.test(lower));
}

/**
 * Computes the real-time clock report for the requested timezone/city or user's local timezone
 */
export function getClockReport(userQuery: string, defaultTimeZone?: string): ClockReport {
  const lower = userQuery.toLowerCase().trim();
  let selectedTimeZone = defaultTimeZone || "Asia/Kolkata";
  let targetCity: string | undefined;

  // Check if user specifically asked for time in a specific city/country
  for (const [city, tz] of Object.entries(CITY_TIMEZONE_MAP)) {
    if (lower.includes(`in ${city}`) || lower.includes(`for ${city}`) || lower.includes(`at ${city}`)) {
      selectedTimeZone = tz;
      targetCity = city.charAt(0).toUpperCase() + city.slice(1);
      break;
    }
  }

  const now = new Date();

  // Format in selected timezone
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: selectedTimeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const secondsFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: selectedTimeZone,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: selectedTimeZone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const dayFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: selectedTimeZone,
    weekday: "long",
  });

  // Calculate UTC offset
  let utcOffset = "+00:00";
  try {
    const tzString = now.toLocaleTimeString("en-US", {
      timeZone: selectedTimeZone,
      timeZoneName: "shortOffset",
    });
    const match = tzString.match(/GMT([+-]\d+(?::\d+)?)/);
    if (match) {
      utcOffset = match[1];
    }
  } catch {}

  const currentTime = timeFormatter.format(now);
  const currentSeconds = secondsFormatter.format(now);
  const currentDate = dateFormatter.format(now);
  const dayOfWeek = dayFormatter.format(now);

  const locationDisplay = targetCity ? targetCity : selectedTimeZone.replace("_", " ");
  const summaryText = `The current time${targetCity ? ` in ${targetCity}` : ""} is **${currentTime}** (${dayOfWeek}, ${currentDate}) [${selectedTimeZone} / UTC${utcOffset}].`;

  return {
    currentTime,
    currentSeconds,
    currentDate,
    dayOfWeek,
    timeZone: `${selectedTimeZone} (${utcOffset})`,
    rawTimeZone: selectedTimeZone,
    utcOffset,
    timestamp: now.getTime(),
    targetCity,
    summaryText,
  };
}

