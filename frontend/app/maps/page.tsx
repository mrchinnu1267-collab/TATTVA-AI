"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  Search,
  MapPin,
  Sparkles,
  Compass,
  Layers,
  ExternalLink,
  Navigation,
  Share2,
  X,
} from "lucide-react";

// Dynamically import Leaflet NativeMap with ssr: false
const NativeMap = dynamic(() => import("../components/NativeMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#0a0a0c] text-white">
      <div className="h-8 w-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
      <span className="text-sm font-semibold tracking-wide">Initializing Satellite Map...</span>
      <span className="text-xs text-neutral-400 mt-1">Connecting to high-res satellite feed</span>
    </div>
  ),
});

function MapsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQuery = searchParams.get("q") || "Bangalore, India";
  const [query, setQuery] = useState(initialQuery);
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [locationName, setLocationName] = useState(initialQuery);
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: 12.9716,
    lng: 77.5946,
  });
  const [mode, setMode] = useState<"roadmap" | "satellite">("satellite");
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Initial geocode lookup
  useEffect(() => {
    if (initialQuery) {
      handleSearch(undefined, initialQuery);
    }
  }, []);

  // Search place or coordinates
  async function handleSearch(e?: React.FormEvent, customQuery?: string) {
    if (e) e.preventDefault();
    const q = (customQuery !== undefined ? customQuery : searchInput).trim();
    if (!q) return;

    setIsLoading(true);
    setQuery(q);

    try {
      // 1. Direct TATTVA Satellite Map API
      const res = await fetch(`/api/map?q=${encodeURIComponent(q)}&mode=${mode}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && typeof data.lat === "number" && typeof data.lng === "number") {
          setCoords({ lat: data.lat, lng: data.lng });
          setLocationName(data.displayName || q);
          showToast(`Satellite View: ${data.displayName ? data.displayName.split(",")[0] : q} 🛰️`);
          setIsLoading(false);
          return;
        }
      }

      // 2. Fallback to geocoding
      const geoRes = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData.results && geoData.results.length > 0) {
          const first = geoData.results[0];
          const newLat = parseFloat(first.lat);
          const newLng = parseFloat(first.lon);
          setCoords({ lat: newLat, lng: newLng });
          setLocationName(first.display_name);
          showToast(`Satellite View: ${first.display_name.split(",")[0]} 🛰️`);
          setIsLoading(false);
          return;
        }
      }
      showToast(`No coordinates found for "${q}". Showing default view.`);
    } catch {
      showToast("Map lookup error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  // Locate current GPS
  function handleLocateMe() {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      showToast("GPS geolocation not available on this device");
      return;
    }

    setIsLocating(true);
    showToast("Detecting your GPS location...");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            { headers: { "User-Agent": "TattvaAI-SatelliteMap/1.0" } }
          );
          if (res.ok) {
            const data = await res.json();
            const place = data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            setLocationName(place);
            setQuery(place.split(",")[0]);
            setSearchInput(place.split(",")[0]);
            showToast(`GPS Centered: ${place.split(",")[0]} 📍`);
            return;
          }
        } catch {}

        const coordStr = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        setLocationName(coordStr);
        setQuery(coordStr);
        setSearchInput(coordStr);
        showToast("Centered to your GPS coordinates 📍");
      },
      () => {
        setIsLocating(false);
        showToast("Could not access GPS. Please check location permissions.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  // Quick category search
  function handleCategory(cat: string) {
    const basePlace = locationName ? locationName.split(",")[0] : query;
    const q = `${cat} in ${basePlace}`;
    setSearchInput(q);
    handleSearch(undefined, q);
  }

  // Ask TATTVA AI about this place
  function handleAskAI() {
    const prompt = `Give me a comprehensive guide and insider recommendations for ${locationName || query}: top places to visit, local cuisine, safety tips, and travel secrets.`;
    router.push(`/chat?prompt=${encodeURIComponent(prompt)}`);
  }

  return (
    <div className="fixed inset-0 w-full h-full max-h-screen h-[100dvh] max-h-[100dvh] overflow-hidden flex flex-col bg-[#0a0a0c] text-white font-sans select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-2xl bg-black/90 border border-white/20 text-white px-4 py-2 text-xs font-semibold shadow-2xl backdrop-blur-xl animate-in fade-in">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="flex-shrink-0 z-30 border-b border-white/10 bg-[#121316]/95 backdrop-blur-xl px-3 sm:px-6 py-2.5 pt-[max(env(safe-area-inset-top,0px),12px)] sm:pt-2.5">
        <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
          {/* Left: Back to Chat Button & Branding */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => router.push("/chat")}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition cursor-pointer active:scale-95"
              title="Return to Chat"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-white flex items-center gap-1.5">
                  <span className="text-emerald-400">TATTVA</span> Satellite Maps
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                  {mode === "satellite" ? "Satellite Live" : "Road Map"}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 truncate max-w-[180px] sm:max-w-sm hidden sm:block">
                {locationName || "Interactive satellite exploration"}
              </p>
            </div>
          </div>

          {/* Right: Mode Toggle & Share */}
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl border border-white/15 p-0.5 bg-white/5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMode("satellite")}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  mode === "satellite"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <span>🛰️</span>
                <span className="hidden sm:inline">Satellite</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("roadmap")}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  mode === "roadmap"
                    ? "bg-white/20 text-white shadow-xs"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <span>🗺️</span>
                <span className="hidden sm:inline">Map</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                if (navigator.share) {
                  navigator
                    .share({
                      title: "TATTVA Satellite Map",
                      text: `Explore ${locationName} on TATTVA Satellite Maps`,
                      url: window.location.href,
                    })
                    .catch(() => {});
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  showToast("Map URL copied to clipboard 📋");
                }
              }}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition cursor-pointer"
              title="Share Location"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar & GPS Locate Form */}
        <form onSubmit={handleSearch} className="mt-2.5 flex items-center gap-2 max-w-7xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search place, city, address, or GPS coordinates (e.g. 16.2332, 80.5460)..."
              className="w-full rounded-2xl border border-white/15 bg-white/5 pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-neutral-400 outline-none focus:border-emerald-500/50 transition"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-md transition cursor-pointer active:scale-95 shrink-0"
          >
            <Search className="w-4 h-4" />
            <span>Search</span>
          </button>

          <button
            type="button"
            onClick={handleLocateMe}
            disabled={isLocating}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-2xl border text-xs sm:text-sm font-semibold transition cursor-pointer active:scale-95 shrink-0 ${
              isLocating
                ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400 animate-pulse"
                : "border-white/15 bg-white/5 hover:bg-white/10 text-neutral-200"
            }`}
            title="Locate my GPS coordinates"
          >
            <Navigation className={`w-4 h-4 text-emerald-400 ${isLocating ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{isLocating ? "Locating..." : "Locate Me"}</span>
          </button>
        </form>

        {/* Category Exploration Chips */}
        <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar max-w-7xl mx-auto">
          {[
            { label: "Cafes", icon: "☕" },
            { label: "Restaurants", icon: "🍽️" },
            { label: "Hotels", icon: "🏨" },
            { label: "Tourist Attractions", icon: "🏛️" },
            { label: "Fuel & EV", icon: "⚡" },
            { label: "Hospitals", icon: "🏥" },
            { label: "Malls & Shopping", icon: "🛍️" },
          ].map((cat) => (
            <button
              key={cat.label}
              type="button"
              onClick={() => handleCategory(cat.label)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-neutral-300 hover:border-emerald-500/40 hover:text-white text-[11px] font-medium whitespace-nowrap transition cursor-pointer active:scale-95"
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Main Satellite Map Viewport */}
      <main className="flex-1 relative w-full h-full bg-[#0a0a0c] overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-xs">
            <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-black/95 text-white text-xs font-semibold shadow-2xl border border-white/20">
              <span className="h-4 w-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              <span>Acquiring satellite imagery...</span>
            </div>
          </div>
        )}

        {/* Real NativeMap Leaflet Engine */}
        <NativeMap
          lat={coords.lat}
          lng={coords.lng}
          mode={mode}
          label={locationName || query}
          onModeChange={(m) => setMode(m)}
          onMapClick={async (clickedLat, clickedLng) => {
            setCoords({ lat: clickedLat, lng: clickedLng });
            try {
              const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${clickedLat}&lon=${clickedLng}`,
                { headers: { "User-Agent": "TattvaAI-Map/1.0" } }
              );
              if (res.ok) {
                const data = await res.json();
                const place = data.display_name || `${clickedLat.toFixed(4)}, ${clickedLng.toFixed(4)}`;
                setLocationName(place);
                setQuery(place.split(",")[0]);
                setSearchInput(place.split(",")[0]);
                showToast(`Pinned: ${place.split(",")[0]} 📍`);
              }
            } catch {}
          }}
        />
      </main>

      {/* Bottom Floating Bar */}
      <footer className="flex-shrink-0 z-20 border-t border-white/10 bg-[#121316]/95 backdrop-blur-xl px-4 sm:px-6 py-3 pb-[max(env(safe-area-inset-bottom,0px),16px)] sm:pb-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Place Title & GPS details */}
          <div className="min-w-0 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shrink-0">
              <MapPin className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-bold text-white truncate max-w-[160px] sm:max-w-md">
                {locationName || query}
              </h2>
              <p className="text-[10px] text-neutral-400 font-mono">
                {coords.lat.toFixed(4)}° N, {coords.lng.toFixed(4)}° E
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                locationName || query
              )}`}
              target="_blank"
              rel="noreferrer noopener"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-semibold transition"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
              <span>Google Maps</span>
            </a>

            <button
              type="button"
              onClick={handleAskAI}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#D95B26] hover:bg-[#E26630] text-white text-xs font-bold shadow-md transition cursor-pointer active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask TATTVA AI</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function MapsPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-full min-h-screen flex items-center justify-center bg-[#0a0a0c] text-white">
          <div className="h-8 w-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <MapsContent />
    </Suspense>
  );
}
