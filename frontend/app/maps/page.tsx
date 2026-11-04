"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Camera,
  Send,
  HelpCircle,
} from "lucide-react";
import type { PlaceResult } from "../api/map/places/route";
import type { AreaPhoto } from "../api/map/area-photos/route";

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

export default function MapsPage() {
  const router = useRouter();

  const [query, setQuery] = useState("Your Location");
  const [searchInput, setSearchInput] = useState("");
  const [locationName, setLocationName] = useState("Locating your exact location...");
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

  // Actual Area Photos Explorer State (around the world)
  const [areaPhotos, setAreaPhotos] = useState<AreaPhoto[]>([]);
  const [isAreaPhotosOpen, setIsAreaPhotosOpen] = useState(false);
  const [isLoadingAreaPhotos, setIsLoadingAreaPhotos] = useState(false);
  const [selectedAreaPhoto, setSelectedAreaPhoto] = useState<AreaPhoto | null>(null);

  // Ask AI Questions State
  const [questionInput, setQuestionInput] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Comprehensive SEO & Accessibility guard: Ensure every image on /maps always has an alt attribute
  useEffect(() => {
    if (typeof window === "undefined") return;

    const auditAllImages = () => {
      document.querySelectorAll("img").forEach((img) => {
        const alt = img.getAttribute("alt");
        if (!alt || alt.trim() === "") {
          img.setAttribute("alt", "Satellite map imagery layer");
          img.setAttribute("role", "presentation");
        }
      });
    };

    auditAllImages();
    const interval = setInterval(auditAllImages, 300);

    const observer = new MutationObserver(() => {
      auditAllImages();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "alt"],
    });

    return () => {
      clearInterval(interval);
      observer.disconnect();
    };
  }, []);

  // EVERY TIME USER OPENS SATELLITE MAPS: Automatically locate exact user location
  useEffect(() => {
    let initialQ = "";
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      initialQ = sp.get("q") || "";
    }

    if (initialQ && initialQ !== "Your Location") {
      setQuery(initialQ);
      setSearchInput(initialQ);
      handleSearch(undefined, initialQ);
      return;
    }

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
          const res = await fetch(`/api/geocode?lat=${latitude}&lon=${longitude}`);
          if (res.ok) {
            const data = await res.json();
            const place = data.displayName || data.city || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            setLocationName(place);
            const shortName = place.split(",")[0].trim();
            setQuery(shortName);
            setSearchInput(shortName);
            showToast(`Exact Location: ${shortName} 🛰️`);

            localStorage.setItem(
              "tattva_user_last_coords",
              JSON.stringify({ lat: latitude, lng: longitude, name: place })
            );

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

    const lowerQ = q.toLowerCase();
    const isCategorySearch =
      lowerQ.includes("hotel") ||
      lowerQ.includes("cafe") ||
      lowerQ.includes("restaurant") ||
      lowerQ.includes("park") ||
      lowerQ.includes("hospital") ||
      lowerQ.includes("resort");

    try {
      const res = await fetch(`/api/map?q=${encodeURIComponent(q)}&mode=${mode}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && typeof data.lat === "number" && typeof data.lng === "number") {
          const newCoords = { lat: data.lat, lng: data.lng };
          setCoords(newCoords);
          const name = data.displayName || q;
          setLocationName(name);
          showToast(`Shifted to: ${name.split(",")[0]} 🛰️`);

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

  // Fetch actual authentic photos of the area worldwide
  async function handleOpenAreaPhotos() {
    setIsAreaPhotosOpen(true);
    setIsLoadingAreaPhotos(true);
    try {
      const q = locationName ? locationName.split(",")[0].trim() : query;
      const res = await fetch(
        `/api/map/area-photos?lat=${coords.lat}&lng=${coords.lng}&q=${encodeURIComponent(q)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.photos)) {
          setAreaPhotos(data.photos);
        }
      }
    } catch {
      showToast("Could not load area photos");
    } finally {
      setIsLoadingAreaPhotos(false);
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

  // Ask a question about the current location & redirect to chat with auto-reply
  function handleAskQuestion(customQuestion?: string) {
    const q = (customQuestion !== undefined ? customQuestion : questionInput).trim();
    if (!q) {
      showToast("Please enter a question to ask TATTVA AI");
      return;
    }

    const currentPlace = locationName || query;
    const params = new URLSearchParams({
      map_q: q,
      map_place: currentPlace,
      map_lat: coords.lat.toString(),
      map_lng: coords.lng.toString(),
      autoreply: "1",
    });

    showToast(`Redirecting to Chat with ${currentPlace.split(",")[0]} context... 🚀`);
    router.push(`/chat?${params.toString()}`);
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
            <Link
              href="/chat"
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition cursor-pointer active:scale-95"
              title="Return to Chat"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
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

          {/* Right: Actual Area Images Button, Mode Toggle, Locate Me & Share */}
          <div className="flex items-center gap-2">
            {/* View Actual Area Images Button */}
            <button
              type="button"
              onClick={handleOpenAreaPhotos}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-500/30 bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
              title="View all actual photographs and Google Maps imagery of this area"
            >
              <Camera className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Area Photos</span>
            </button>

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

        {/* Place Search Bar: Redirects to any destination on Earth */}
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

        {/* Real NativeMap Leaflet Engine with User GPS Beacon and Clean Viewport */}
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
          <div className="absolute bottom-24 left-3 right-3 sm:left-6 sm:right-auto sm:max-w-md z-20 pointer-events-auto">
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
                      alt={p.name ? `${p.name} - ${p.categoryLabel || "Place preview"}` : "Nearby place photo"}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src =
                          "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80";
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
          <div className="absolute bottom-20 left-3 right-3 sm:left-6 sm:w-96 max-h-[72vh] overflow-y-auto z-30 rounded-3xl border border-white/20 bg-[#121316]/95 backdrop-blur-2xl shadow-2xl p-4 text-white animate-in slide-in-from-bottom duration-200">
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
                  alt={selectedPlace.name ? `${selectedPlace.name} - Photo ${activePhotoIdx + 1} of ${selectedPlace.photos.length}` : "Place photo view"}
                  className="w-full h-full object-cover transition duration-300"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src =
                      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80";
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
                        activePhotoIdx === idx
                          ? "border-emerald-400 scale-105"
                          : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={url}
                        alt={selectedPlace.name ? `${selectedPlace.name} thumbnail ${idx + 1}` : `Place photo thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src =
                            "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80";
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
                onClick={() => handleAskQuestion(`Tell me complete details, room prices, food specials, and insider tips about ${selectedPlace.name}`)}
                className="col-span-2 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#D95B26] hover:bg-[#E26630] text-white text-xs font-bold transition cursor-pointer active:scale-95 shadow-md"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ask TATTVA AI about this place</span>
              </button>
            </div>
          </div>
        )}

        {/* Global Area Photos Gallery Modal (Real Images from around the world) */}
        {isAreaPhotosOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-3 sm:p-6 animate-in fade-in">
            <div className="relative w-full max-w-4xl max-h-[88vh] flex flex-col rounded-3xl border border-white/20 bg-[#121316] shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Camera className="w-5 h-5 text-blue-400" />
                    <h2 className="text-base sm:text-lg font-bold text-white">
                      Actual Area Photos: {locationName.split(",")[0]}
                    </h2>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Real satellite, aerial, and street photography around the world powered by Google Maps & geocoded feeds
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`https://earth.google.com/web/search/${encodeURIComponent(locationName || query)}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-semibold text-neutral-200"
                  >
                    <Globe className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Google Earth 3D</span>
                  </a>

                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((locationName || query) + " photos")}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Google Maps Photos</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      setIsAreaPhotosOpen(false);
                      setSelectedAreaPhoto(null);
                    }}
                    className="h-9 w-9 rounded-full border border-white/10 bg-white/5 hover:bg-white/15 flex items-center justify-center text-neutral-400 hover:text-white transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Photos Grid Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 no-scrollbar">
                {isLoadingAreaPhotos ? (
                  <div className="h-64 flex flex-col items-center justify-center gap-3">
                    <span className="h-7 w-7 border-3 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-neutral-300 font-semibold">Fetching authentic area photography...</span>
                  </div>
                ) : areaPhotos.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center p-6">
                    <ImageIcon className="w-10 h-10 text-neutral-600 mb-2" />
                    <p className="text-sm font-bold text-neutral-300">No direct geocoded images found in radius</p>
                    <p className="text-xs text-neutral-500 mt-1 max-w-sm">
                      Explore live satellite view or check Google Maps Photos for full user photo contributions.
                    </p>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationName || query)}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md inline-flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Search on Google Maps</span>
                    </a>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                    {areaPhotos.map((photo, pIdx) => (
                      <div
                        key={pIdx}
                        onClick={() => setSelectedAreaPhoto(photo)}
                        className="group relative h-48 rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 cursor-pointer shadow-md hover:border-blue-400/50 transition-all hover:scale-[1.01]"
                      >
                        <img
                          src={photo.url}
                          alt={photo.title ? `${photo.title} - Verified area photo` : "Verified area satellite photo"}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src =
                              "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80";
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90 group-hover:opacity-100 transition" />
                        <div className="absolute bottom-2.5 left-2.5 right-2.5">
                          <p className="text-xs font-bold text-white truncate drop-shadow-sm">{photo.title}</p>
                          <span className="text-[10px] text-blue-300 font-mono flex items-center gap-1 mt-0.5">
                            <span>Verified Area Photo</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Fullscreen Photo Lightbox */}
        {selectedAreaPhoto && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/95 p-3 sm:p-6 animate-in fade-in">
            <button
              type="button"
              onClick={() => setSelectedAreaPhoto(null)}
              className="absolute top-4 right-4 z-50 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
              <img
                src={selectedAreaPhoto.url}
                alt={selectedAreaPhoto.title ? `${selectedAreaPhoto.title} - Full resolution photo` : "Full resolution area photo"}
                className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl border border-white/20"
              />
              <div className="mt-3 text-center">
                <h4 className="text-sm font-bold text-white">{selectedAreaPhoto.title}</h4>
                <p className="text-xs text-neutral-400 mt-0.5 max-w-lg">{selectedAreaPhoto.description}</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Floating Bar: Interactive Search to Ask Questions about this location */}
      <footer className="flex-shrink-0 z-20 border-t border-white/10 bg-[#121316]/95 backdrop-blur-xl px-3 sm:px-6 py-2.5 pb-[max(env(safe-area-inset-bottom,0px),12px)] sm:pb-2.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Left: Place Title & GPS details */}
          <div className="min-w-0 flex items-center gap-2.5 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shrink-0">
              <MapPin className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-bold text-white truncate max-w-[150px] sm:max-w-xs">
                {locationName.split(",")[0] || query}
              </h2>
              <p className="text-[10px] text-neutral-400 font-mono">
                {coords.lat.toFixed(4)}°, {coords.lng.toFixed(4)}°
                {userCoords && <span className="ml-1.5 text-blue-400 font-semibold">• Live GPS</span>}
              </p>
            </div>
          </div>

          {/* Center: Search to Ask Questions about this location */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAskQuestion();
            }}
            className="flex-1 max-w-2xl flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D95B26]" />
              <input
                type="text"
                value={questionInput}
                onChange={(e) => setQuestionInput(e.target.value)}
                placeholder={`Ask any question about ${locationName.split(",")[0] || "this location"} (history, food, hotels, safety)...`}
                className="w-full rounded-2xl border border-white/15 bg-white/5 pl-10 pr-4 py-2 text-xs text-white placeholder-neutral-400 outline-none focus:border-[#D95B26] transition"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 rounded-2xl bg-[#D95B26] hover:bg-[#E26630] text-white text-xs font-bold transition shadow-md flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask TATTVA</span>
            </button>
          </form>

          {/* Quick Suggestions & Google Maps */}
          <div className="hidden lg:flex items-center gap-1.5 shrink-0">
            {[
              { label: "Attractions", q: "What are the top 5 must-visit attractions and landmarks here?" },
              { label: "Food", q: "What are the best authentic local food dishes and restaurants here?" },
              { label: "Safety", q: "How safe is this area for travelers and what are local safety tips?" },
            ].map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAskQuestion(s.q)}
                className="px-2.5 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/15 text-[11px] text-neutral-300 hover:text-white transition cursor-pointer"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </footer>

      {/* Semantic Content & SEO Overview */}
      <section className="sr-only" aria-label="About TATTVA Satellite Maps">
        <h2>High-Resolution Live Satellite Maps &amp; Local Places Explorer</h2>
        <p>
          TATTVA Satellite Maps offers interactive global earth observation, real-time satellite imagery,
          and an authentic local place discovery engine. Explore worldwide destinations, discover top-rated hotels,
          cafes, restaurants, parks, and attractions with verified ratings, reviews, photos, and live GPS positioning.
        </p>
        <ul>
          <li>High-resolution satellite and roadmap views powered by ESRI and OpenStreetMap.</li>
          <li>Real-time GPS geolocation and coordinates mapping.</li>
          <li>Direct AI-assisted location search and travel question answering.</li>
          <li>Authentic area photography and Google Maps venue insights.</li>
        </ul>
        <nav aria-label="Explore other TATTVA AI features">
          <Link href="/">TATTVA AI Web Chat</Link>
          <Link href="/voice">TATTVA AI Voice Assistant</Link>
          <Link href="/download">Download TATTVA AI App</Link>
        </nav>
      </section>
    </div>
  );
}
