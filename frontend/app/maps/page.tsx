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
  Star,
  Phone,
  Globe,
  Clock,
  Image as ImageIcon,
  ChevronRight,
  Maximize2,
} from "lucide-react";
import type { PlaceResult } from "../api/map/places/route";

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

  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery || "Your Location");
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [locationName, setLocationName] = useState(initialQuery || "Locating your exact location...");
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: 12.9716,
    lng: 77.5946,
  });
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mode, setMode] = useState<"roadmap" | "satellite">("satellite");
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Places Explorer State
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // EVERY TIME USER OPENS SATELLITE MAPS: Automatically locate exact user location
  useEffect(() => {
    // 1. Check if user already asked for a specific place in URL
    if (initialQuery && initialQuery !== "Your Location") {
      handleSearch(undefined, initialQuery);
      return;
    }

    // 2. Load cached coordinates if available for instant rendering
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("tattva_user_last_coords");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.lat && parsed.lng) {
            setCoords({ lat: parsed.lat, lng: parsed.lng });
            setUserCoords({ lat: parsed.lat, lng: parsed.lng });
            if (parsed.name) {
              setLocationName(parsed.name);
              setQuery(parsed.name);
            }
          }
        }
      } catch {}
    }

    // 3. Automatically trigger live GPS location detection every time
    handleLocateMe(true);
  }, []);

  // Locate exact GPS position
  function handleLocateMe(isInitial = false) {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      if (!isInitial) showToast("GPS geolocation is not supported on this device");
      return;
    }

    setIsLocating(true);
    if (!isInitial) showToast("Detecting your exact GPS location...");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        const newCoords = { lat: latitude, lng: longitude };
        setCoords(newCoords);
        setUserCoords(newCoords);

        try {
          // Reverse geocode via server-side geocode route (immune to CSP)
          const res = await fetch(`/api/geocode?lat=${latitude}&lon=${longitude}`);
          if (res.ok) {
            const data = await res.json();
            const place = data.displayName || data.city || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            setLocationName(place);
            const shortName = place.split(",")[0].trim();
            setQuery(shortName);
            setSearchInput(shortName);
            showToast(`Exact Location: ${shortName} 🛰️`);

            // Save to local storage for quick subsequent loads
            localStorage.setItem(
              "tattva_user_last_coords",
              JSON.stringify({ lat: latitude, lng: longitude, name: place })
            );

            // Fetch nearby places for the user's location
            fetchNearbyPlaces("all", newCoords, shortName);
            return;
          }
        } catch {}

        const coordStr = `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`;
        setLocationName(coordStr);
        setQuery(coordStr);
        setSearchInput(coordStr);
        showToast("Centered to your exact GPS coordinates 📍");
      },
      () => {
        setIsLocating(false);
        if (!isInitial) {
          showToast("Could not access GPS. Please verify location permissions.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  // Search a place, city, landmark, or address and redirect map
  async function handleSearch(e?: React.FormEvent, customQuery?: string) {
    if (e) e.preventDefault();
    const q = (customQuery !== undefined ? customQuery : searchInput).trim();
    if (!q) return;

    setIsLoading(true);
    setQuery(q);

    // Check if query is looking for places (e.g., "hotels in Paris", "cafes in Goa")
    const lowerQ = q.toLowerCase();
    const isCategorySearch =
      lowerQ.includes("hotel") ||
      lowerQ.includes("cafe") ||
      lowerQ.includes("restaurant") ||
      lowerQ.includes("park") ||
      lowerQ.includes("hospital") ||
      lowerQ.includes("resort");

    try {
      // 1. Geocode place query
      const res = await fetch(`/api/map?q=${encodeURIComponent(q)}&mode=${mode}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && typeof data.lat === "number" && typeof data.lng === "number") {
          const newCoords = { lat: data.lat, lng: data.lng };
          setCoords(newCoords);
          const name = data.displayName || q;
          setLocationName(name);
          showToast(`Shifted to: ${name.split(",")[0]} 🛰️`);

          // Fetch places for this location
          const cat = lowerQ.includes("hotel")
            ? "hotel"
            : lowerQ.includes("cafe")
            ? "cafe"
            : lowerQ.includes("restaurant")
            ? "restaurant"
            : lowerQ.includes("park")
            ? "park"
            : isCategorySearch
            ? "all"
            : selectedCategory;

          fetchNearbyPlaces(cat, newCoords, q);
          setIsLoading(false);
          return;
        }
      }

      // 2. Fallback to geocoding endpoint
      const geoRes = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData.results && geoData.results.length > 0) {
          const first = geoData.results[0];
          const newLat = parseFloat(first.lat);
          const newLng = parseFloat(first.lon);
          const newCoords = { lat: newLat, lng: newLng };
          setCoords(newCoords);
          setLocationName(first.display_name);
          showToast(`Shifted to: ${first.display_name.split(",")[0]} 🛰️`);
          fetchNearbyPlaces(selectedCategory, newCoords, q);
          setIsLoading(false);
          return;
        }
      }
      showToast(`No coordinates found for "${q}".`);
    } catch {
      showToast("Map lookup error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  // Fetch places (Hotels, Cafes, Restaurants, Parks, Attractions)
  async function fetchNearbyPlaces(cat: string, targetCoords = coords, targetQuery = query) {
    setIsLoadingPlaces(true);
    setSelectedCategory(cat);

    try {
      const url = `/api/map/places?category=${encodeURIComponent(cat)}&lat=${targetCoords.lat}&lng=${
        targetCoords.lng
      }&q=${encodeURIComponent(targetQuery)}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.places)) {
          setPlaces(data.places);
          if (data.places.length > 0) {
            // Automatically select first place if user explicitly searched category
            if (cat !== "all") {
              setSelectedPlace(data.places[0]);
              setActivePhotoIdx(0);
            }
          }
        }
      }
    } catch {
      console.warn("Could not fetch places");
    } finally {
      setIsLoadingPlaces(false);
    }
  }

  // Quick category chip handler
  function handleCategoryClick(catKey: string, catLabel: string) {
    setSelectedCategory(catKey);
    const basePlace = locationName ? locationName.split(",")[0].trim() : query;
    const q = `${catLabel} in ${basePlace}`;
    setSearchInput(q);
    fetchNearbyPlaces(catKey, coords, q);
    showToast(`Exploring ${catLabel} in ${basePlace}... 🔍`);
  }

  // Shift satellite map directly to a selected place
  function shiftMapToPlace(place: PlaceResult) {
    setSelectedPlace(place);
    setActivePhotoIdx(0);
    setCoords({ lat: place.lat, lng: place.lng });
    setLocationName(`${place.name}, ${place.address}`);
    showToast(`Shifted to ${place.name} 🛰️`);
  }

  // Ask AI about this place
  function handleAskAI(place?: PlaceResult) {
    const target = place ? `${place.name} in ${place.city}` : locationName || query;
    const prompt = `Give me a comprehensive guide and insider recommendations for ${target}: top attractions, ratings, menus, safety tips, and travel secrets.`;
    router.push(`/chat?prompt=${encodeURIComponent(prompt)}`);
  }

  return (
    <div className="fixed inset-0 w-full h-full max-h-screen h-[100dvh] max-h-[100dvh] overflow-hidden flex flex-col bg-[#0a0a0c] text-white font-sans select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-2xl bg-black/95 border border-emerald-500/30 text-white px-4 py-2 text-xs font-semibold shadow-2xl backdrop-blur-xl animate-in fade-in">
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
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{mode === "satellite" ? "Satellite Live" : "Road Map"}</span>
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 truncate max-w-[200px] sm:max-w-md hidden sm:block">
                {locationName || "Interactive satellite exploration"}
              </p>
            </div>
          </div>

          {/* Right: Mode Toggle, Locate Me & Share */}
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
              onClick={() => handleLocateMe(false)}
              disabled={isLocating}
              className={`flex h-9 items-center gap-1.5 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer active:scale-95 ${
                isLocating
                  ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400 animate-pulse"
                  : "border-white/15 bg-white/5 hover:bg-white/10 text-neutral-200"
              }`}
              title="Locate my exact live position"
            >
              <Navigation className={`w-3.5 h-3.5 text-emerald-400 ${isLocating ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{isLocating ? "Locating..." : "My GPS"}</span>
            </button>

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

        {/* Search Bar: Redirects to any other place or searches hotels/cafes */}
        <form onSubmit={handleSearch} className="mt-2.5 flex items-center gap-2 max-w-7xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search place, city, hotel, cafe, restaurant, park, or GPS coords (e.g. Paris, Taj Mahal, OYO)..."
              className="w-full rounded-2xl border border-white/15 bg-white/5 pl-10 pr-9 py-2 text-xs sm:text-sm text-white placeholder-neutral-400 outline-none focus:border-emerald-500/50 transition"
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
        </form>

        {/* Category Exploration Chips: Hotels, Cafes, Restaurants, Parks, Attractions */}
        <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar max-w-7xl mx-auto">
          {[
            { key: "hotel", label: "Hotels & Resorts", icon: "🏨" },
            { key: "restaurant", label: "Restaurants", icon: "🍽️" },
            { key: "cafe", label: "Cafes & Coffee", icon: "☕" },
            { key: "park", label: "Parks & Nature", icon: "🌳" },
            { key: "attraction", label: "Attractions", icon: "🏛️" },
            { key: "hospital", label: "Hospitals", icon: "🏥" },
            { key: "all", label: "All Places", icon: "📍" },
          ].map((cat) => {
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => handleCategoryClick(cat.key, cat.label)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-semibold whitespace-nowrap transition cursor-pointer active:scale-95 ${
                  isSelected
                    ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-300 shadow-xs"
                    : "border-white/10 bg-white/5 text-neutral-300 hover:border-white/30 hover:text-white"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Satellite Map Viewport */}
      <main className="flex-1 relative w-full h-full bg-[#0a0a0c] overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-xs">
            <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-black/95 text-white text-xs font-semibold shadow-2xl border border-white/20">
              <span className="h-4 w-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              <span>Acquiring high-resolution satellite imagery...</span>
            </div>
          </div>
        )}

        {/* Real NativeMap Leaflet Engine with User GPS Beacon and Places Markers */}
        <NativeMap
          lat={coords.lat}
          lng={coords.lng}
          mode={mode}
          label={locationName || query}
          userCoords={userCoords}
          places={places}
          selectedPlaceId={selectedPlace?.id}
          onModeChange={(m) => setMode(m)}
          onSelectPlace={(place) => {
            shiftMapToPlace(place);
          }}
          onMapClick={async (clickedLat, clickedLng) => {
            setCoords({ lat: clickedLat, lng: clickedLng });
            try {
              const res = await fetch(`/api/geocode?lat=${clickedLat}&lon=${clickedLng}`);
              if (res.ok) {
                const data = await res.json();
                const place = data.displayName || `${clickedLat.toFixed(4)}, ${clickedLng.toFixed(4)}`;
                setLocationName(place);
                setQuery(place.split(",")[0]);
                setSearchInput(place.split(",")[0]);
                showToast(`Pinned: ${place.split(",")[0]} 📍`);
                fetchNearbyPlaces("all", { lat: clickedLat, lng: clickedLng }, place.split(",")[0]);
              }
            } catch {}
          }}
        />

        {/* Floating Discovered Places Carousel (Bottom-Left) */}
        {places.length > 0 && !selectedPlace && (
          <div className="absolute bottom-20 left-3 right-3 sm:left-6 sm:right-auto sm:max-w-md z-20 pointer-events-auto">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                <span>📍 Nearby Places</span>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px]">
                  {places.length} found
                </span>
              </span>
              <button
                type="button"
                onClick={() => setPlaces([])}
                className="text-[11px] text-neutral-400 hover:text-white cursor-pointer"
              >
                Dismiss
              </button>
            </div>

            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar">
              {places.map((p) => (
                <div
                  key={p.id}
                  onClick={() => shiftMapToPlace(p)}
                  className="flex-shrink-0 w-64 rounded-2xl border border-white/15 bg-[#121316]/95 backdrop-blur-xl p-3 shadow-2xl cursor-pointer hover:border-emerald-500/50 transition-all hover:scale-[1.02] active:scale-95"
                >
                  <div className="relative h-24 w-full rounded-xl overflow-hidden mb-2 bg-neutral-900">
                    <img
                      src={p.photos[0]}
                      alt={p.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80";
                      }}
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-xs text-[10px] font-bold text-white border border-white/20">
                      {p.category === "hotel"
                        ? "🏨 Hotel"
                        : p.category === "cafe"
                        ? "☕ Cafe"
                        : p.category === "restaurant"
                        ? "🍽️ Dining"
                        : p.category === "park"
                        ? "🌳 Park"
                        : "🏛️ Place"}
                    </div>
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-amber-500/90 text-black text-[10px] font-extrabold flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-current" />
                      <span>{p.rating}</span>
                    </div>
                  </div>

                  <h3 className="font-bold text-xs text-white truncate">{p.name}</h3>
                  <p className="text-[11px] text-neutral-400 truncate mt-0.5">{p.address}</p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10 text-[10px] text-neutral-300">
                    <span className="text-emerald-400 font-semibold">{p.reviewsCount.toLocaleString()} Google reviews</span>
                    <span className="font-mono text-neutral-400">{p.distanceKm ? `${p.distanceKm} km` : ""}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Place Inspection Drawer / Modal with Google Images and Ratings */}
        {selectedPlace && (
          <div className="absolute bottom-16 sm:bottom-20 left-3 right-3 sm:left-6 sm:w-96 max-h-[75vh] overflow-y-auto z-30 rounded-3xl border border-white/20 bg-[#121316]/95 backdrop-blur-2xl shadow-2xl p-4 text-white animate-in slide-in-from-bottom duration-200">
            {/* Header & Close */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                    {selectedPlace.categoryLabel}
                  </span>
                  <span className="text-xs font-mono text-neutral-400">{selectedPlace.priceLevel}</span>
                </div>
                <h3 className="text-base font-extrabold text-white leading-tight">
                  {selectedPlace.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlace(null)}
                className="h-8 w-8 rounded-full border border-white/10 bg-white/5 hover:bg-white/15 flex items-center justify-center text-neutral-400 hover:text-white transition shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Google Images & Multi-Photo Showcase */}
            <div className="space-y-2 mb-3">
              <div className="relative h-44 w-full rounded-2xl overflow-hidden bg-neutral-900 border border-white/10">
                <img
                  src={selectedPlace.photos[activePhotoIdx] || selectedPlace.photos[0]}
                  alt={selectedPlace.name}
                  className="w-full h-full object-cover transition duration-300"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80";
                  }}
                />
                <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-xl bg-black/80 backdrop-blur-md text-[10px] font-semibold text-neutral-200 border border-white/20 flex items-center gap-1.5">
                  <ImageIcon className="w-3 h-3 text-emerald-400" />
                  <span>Photo {activePhotoIdx + 1} of {selectedPlace.photos.length}</span>
                </div>

                <a
                  href={selectedPlace.googlePhotosUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="absolute bottom-2 right-2 px-2.5 py-1 rounded-xl bg-blue-600/90 hover:bg-blue-500 text-white text-[10px] font-bold shadow-md transition flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Google Images</span>
                </a>
              </div>

              {/* Thumbnail Strip */}
              {selectedPlace.photos.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {selectedPlace.photos.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActivePhotoIdx(idx)}
                      className={`relative h-12 w-16 rounded-lg overflow-hidden shrink-0 border-2 transition cursor-pointer ${
                        activePhotoIdx === idx ? "border-emerald-400 scale-105" : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={url}
                        alt={`Photo ${idx}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80";
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Verified Google Rating & Reviews */}
            <div className="p-3 rounded-2xl border border-white/10 bg-white/5 mb-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-amber-400">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="text-base font-extrabold text-white">{selectedPlace.rating}</span>
                  <span className="text-xs text-neutral-400">/ 5.0</span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  {selectedPlace.reviewsCount.toLocaleString()} verified Google ratings
                </p>
              </div>

              <div className="text-right">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                  Verified Place
                </span>
                <p className="text-[10px] text-neutral-400 font-mono mt-1">
                  {selectedPlace.lat.toFixed(4)}°, {selectedPlace.lng.toFixed(4)}°
                </p>
              </div>
            </div>

            {/* Building Name & Verified Address */}
            <div className="space-y-1.5 mb-3 text-xs">
              <div className="flex items-start gap-2 text-neutral-300">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{selectedPlace.address}</span>
              </div>

              <div className="flex items-center gap-2 text-neutral-300 text-[11px]">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{selectedPlace.openingHours}</span>
              </div>

              {selectedPlace.phone && (
                <div className="flex items-center gap-2 text-neutral-300 text-[11px]">
                  <Phone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <a href={`tel:${selectedPlace.phone}`} className="hover:underline text-blue-400">
                    {selectedPlace.phone}
                  </a>
                </div>
              )}
            </div>

            {/* Amenities & Badges */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {selectedPlace.amenities.map((am, aIdx) => (
                <span
                  key={aIdx}
                  className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-neutral-300"
                >
                  {am}
                </span>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => shiftMapToPlace(selectedPlace)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer active:scale-95"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Shift Satellite</span>
              </button>

              <a
                href={selectedPlace.googleMapsUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-neutral-200 text-xs font-semibold transition"
              >
                <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                <span>Google Maps</span>
              </a>

              <button
                type="button"
                onClick={() => handleAskAI(selectedPlace)}
                className="col-span-2 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#D95B26] hover:bg-[#E26630] text-white text-xs font-bold transition cursor-pointer active:scale-95 shadow-md"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ask TATTVA AI about this place</span>
              </button>
            </div>
          </div>
        )}
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
                {userCoords && (
                  <span className="ml-2 text-blue-400 font-semibold">• Live GPS Active</span>
                )}
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
              onClick={() => handleAskAI()}
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
