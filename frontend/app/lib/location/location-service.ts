/**
 * TATTVA AI - Device Geolocation & Reverse Geocoding Service
 * Secure, user-permissioned location management
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export interface UserLocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  displayName?: string;
  isApproximate?: boolean;
  timestamp: number;
}

export type GeolocationStatus =
  | "prompt"
  | "requesting"
  | "granted"
  | "denied"
  | "unavailable"
  | "timeout"
  | "unsupported";

/**
 * Detects whether the user prompt is asking about their location or nearby surroundings
 */
export function isLocationQuery(prompt: string): boolean {
  if (!prompt || typeof prompt !== "string") return false;
  const lower = prompt.toLowerCase().trim();

  const patterns = [
    /\b(?:where am i|what is my location|what's my location|locate my location)\b/i,
    /\b(?:find my (?:current )?location|get my location|show my location|detect my location)\b/i,
    /\b(?:what is my current (?:city|town|place|coordinates|gps))\b/i,
    /\b(?:what's my (?:current )?(?:city|town|place|coordinates|gps(?: location)?))\b/i,
    /\b(?:what city am i in)\b/i,
    /\b(?:show my (?:current )?coordinates|tell me (?:my )?coordinates|my (?:current )?coordinates)\b/i,
    /\b(?:where is my device|locate my device|locate me|current location)\b/i,
    /\b(?:what (?:is|are) around me|places around me|find nearby places|what's nearby)\b/i,
    /\b(?:where am i right now)\b/i,
  ];

  return patterns.some((p) => p.test(lower));
}

/**
 * Requests device location from the browser with high-accuracy GPS preference
 * and resolves reverse geocoding via /api/geocode
 */
export async function requestDeviceLocation(): Promise<UserLocationData> {
  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    throw new Error("GEOLOCATION_UNSUPPORTED: Geolocation is not supported by your browser or device.");
  }

  // Wrap getCurrentPosition in Promise
  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 30000,
    });
  }).catch((err: GeolocationPositionError) => {
    if (err.code === err.PERMISSION_DENIED) {
      throw new Error(
        "GEOLOCATION_DENIED: Location permission was denied. Please allow location access in your browser settings (look for the location or tune icon in your address bar)."
      );
    } else if (err.code === err.POSITION_UNAVAILABLE) {
      throw new Error(
        "GEOLOCATION_UNAVAILABLE: Location information is currently unavailable. Ensure your device's location/GPS is switched on."
      );
    } else if (err.code === err.TIMEOUT) {
      throw new Error("GEOLOCATION_TIMEOUT: Timed out waiting for device location. Please try again.");
    }
    throw new Error(`GEOLOCATION_ERROR: ${err.message}`);
  });

  const lat = position.coords.latitude;
  const lon = position.coords.longitude;
  const accuracy = position.coords.accuracy;

  let city = "";
  let district = "";
  let state = "";
  let country = "";
  let displayName = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;

  try {
    const res = await fetch(`/api/geocode?lat=${lat}&lon=${lon}`);
    if (res.ok) {
      const data = await res.json();
      city = data.city || data.address?.city || data.address?.town || data.address?.village || "";
      district = data.address?.county || data.address?.state_district || "";
      state = data.address?.state || "";
      country = data.address?.country || "";
      displayName = data.displayName || `${city}, ${country}`;
    }
  } catch (geoErr) {
    console.warn("[LocationService] Reverse geocode error:", geoErr);
  }

  return {
    latitude: lat,
    longitude: lon,
    accuracy,
    city: city || undefined,
    district: district || undefined,
    state: state || undefined,
    country: country || undefined,
    displayName,
    isApproximate: false,
    timestamp: Date.now(),
  };
}

/**
 * Builds ground-truth location context to inject into AI prompt
 */
export function buildLocationDirective(loc?: UserLocationData | null): string {
  if (!loc || typeof loc.latitude !== "number" || typeof loc.longitude !== "number") {
    return "";
  }

  const parts: string[] = [];
  if (loc.city) parts.push(`City: ${loc.city}`);
  if (loc.district) parts.push(`District: ${loc.district}`);
  if (loc.state) parts.push(`State: ${loc.state}`);
  if (loc.country) parts.push(`Country: ${loc.country}`);
  parts.push(`Coordinates: ${loc.latitude.toFixed(5)}° N/S, ${loc.longitude.toFixed(5)}° E/W`);
  if (loc.accuracy) parts.push(`Accuracy: Within ~${Math.round(loc.accuracy)} meters`);
  if (loc.displayName) parts.push(`Full Address: ${loc.displayName}`);

  return `
===============================================================================
VERIFIED USER DEVICE LOCATION (EXPLICIT USER CONSENT GRANTED)
===============================================================================
The user has granted location permission. Ground all geographic questions in these verified details:
${parts.map((p) => `- ${p}`).join("\n")}

DIRECTIVES:
1. When the user asks "Where am I?", "Locate my location", or similar queries, state their current city, locality, and region clearly and warmly.
2. Provide a direct link to view their location in Google Maps:
   https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}
3. If they ask for nearby places, recommend establishments relative to this exact locality.
===============================================================================
`;
}
