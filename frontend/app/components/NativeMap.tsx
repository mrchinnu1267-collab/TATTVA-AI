"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { PlaceResult } from "../api/map/places/route";

interface NativeMapProps {
  lat: number;
  lng: number;
  zoom?: number;
  mode?: "roadmap" | "satellite";
  label?: string;
  userCoords?: { lat: number; lng: number } | null;
  places?: PlaceResult[];
  selectedPlaceId?: string | null;
  onMapClick?: (lat: number, lng: number) => void;
  onModeChange?: (mode: "roadmap" | "satellite") => void;
  onSelectPlace?: (place: PlaceResult) => void;
}

export default function NativeMap({
  lat,
  lng,
  zoom = 15,
  mode = "satellite",
  label = "Location",
  userCoords,
  places = [],
  selectedPlaceId,
  onMapClick,
  onModeChange,
  onSelectPlace,
}: NativeMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const mainMarkerRef = useRef<L.Marker | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const placesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const [currentMode, setCurrentMode] = useState<"roadmap" | "satellite">(mode);

  // Sync internal mode with prop
  useEffect(() => {
    setCurrentMode(mode);
  }, [mode]);

  // Construct high-reliability tile layer using our local /api/map/tile proxy
  const createTileLayer = useCallback((tileMode: "roadmap" | "satellite") => {
    const localProxyUrl = `/api/map/tile?z={z}&x={x}&y={y}&mode=${tileMode}`;

    const layer = L.tileLayer(localProxyUrl, {
      maxZoom: 20,
      minZoom: 2,
      attribution:
        tileMode === "satellite"
          ? "&copy; Google &copy; ESRI Satellite"
          : "&copy; Google &copy; OpenStreetMap",
      errorTileUrl: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    });

    layer.on("tileload", function (event: any) {
      if (event.tile && !event.tile.hasAttribute("alt")) {
        event.tile.setAttribute("alt", "");
      }
    });

    layer.on("tileerror", function (error: any) {
      const tile = error.tile;
      if (tile) {
        tile.setAttribute("alt", "");
        if (!tile.dataset.retried) {
          tile.dataset.retried = "true";
          if (tileMode === "satellite") {
            tile.src = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${error.coords.z}/${error.coords.y}/${error.coords.x}`;
          } else {
            tile.src = `https://tile.openstreetmap.org/${error.coords.z}/${error.coords.x}/${error.coords.y}.png`;
          }
        }
      }
    });

    return layer;
  }, []);

  // Initialize Map on mount
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: zoom,
      zoomControl: false,
      attributionControl: false,
    });
    mapRef.current = map;

    // Add initial tile layer
    const initialLayer = createTileLayer(currentMode);
    initialLayer.addTo(map);
    tileLayerRef.current = initialLayer;

    // Create places layer group
    const placesGroup = L.layerGroup().addTo(map);
    placesLayerGroupRef.current = placesGroup;

    // Primary Location Beacon Pin (Emerald)
    const pinIcon = L.divIcon({
      className: "custom-satellite-pin",
      html: `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:40px;height:40px;">
          <div style="position:absolute;width:40px;height:40px;border-radius:50%;background:rgba(16,185,129,0.35);animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
          <div style="position:relative;display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;background:#10b981;box-shadow:0 0 16px rgba(16,185,129,0.9);border:2.5px solid #ffffff;color:#fff;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40],
    });

    const marker = L.marker([lat, lng], { icon: pinIcon }).addTo(map);
    mainMarkerRef.current = marker;

    const popupHtml = `
      <div style="font-family:system-ui,-apple-system,sans-serif;padding:4px 6px;font-size:12px;line-height:1.4;color:#111;">
        <b style="font-size:13px;color:#059669;display:block;margin-bottom:2px;">📍 ${label}</b>
        <span style="color:#6b7280;font-size:11px;">${lat.toFixed(4)}°, ${lng.toFixed(4)}°</span>
      </div>
    `;
    marker.bindPopup(popupHtml);

    // Map click handler
    map.on("click", (e: L.LeafletMouseEvent) => {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    });

    // Invalidate size immediately
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 400);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      ro = new ResizeObserver(() => {
        if (mapRef.current) mapRef.current.invalidateSize();
      });
      ro.observe(containerRef.current);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (ro) ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Tile Layer when mode changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const newLayer = createTileLayer(currentMode);
    newLayer.addTo(map);
    tileLayerRef.current = newLayer;
    map.invalidateSize();
  }, [currentMode, createTileLayer]);

  // Update Coordinates and Main Marker
  useEffect(() => {
    const map = mapRef.current;
    const marker = mainMarkerRef.current;
    if (!map || !marker) return;

    map.flyTo([lat, lng], zoom, { duration: 1.2 });
    marker.setLatLng([lat, lng]);

    const popupHtml = `
      <div style="font-family:system-ui,-apple-system,sans-serif;padding:4px 6px;font-size:12px;line-height:1.4;color:#111;">
        <b style="font-size:13px;color:#059669;display:block;margin-bottom:2px;">📍 ${label}</b>
        <span style="color:#6b7280;font-size:11px;">${lat.toFixed(4)}°, ${lng.toFixed(4)}°</span>
      </div>
    `;
    marker.setPopupContent(popupHtml);
    map.invalidateSize();
  }, [lat, lng, zoom, label]);

  // Render Live User GPS Beacon if userCoords are provided
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!userCoords) {
      if (userMarkerRef.current) {
        map.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
      }
      return;
    }

    const userIcon = L.divIcon({
      className: "user-gps-beacon",
      html: `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:36px;height:36px;">
          <div style="position:absolute;width:36px;height:36px;border-radius:50%;background:rgba(59,130,246,0.3);animation:ping 1.6s cubic-bezier(0,0,0.2,1) infinite;"></div>
          <div style="position:relative;width:18px;height:18px;border-radius:50%;background:#3b82f6;border:3px solid #ffffff;box-shadow:0 0 12px rgba(59,130,246,0.9);"></div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userCoords.lat, userCoords.lng]);
    } else {
      const userMarker = L.marker([userCoords.lat, userCoords.lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
      userMarker.bindPopup(`
        <div style="font-family:system-ui,-apple-system,sans-serif;padding:4px 6px;font-size:11px;color:#111;">
          <b style="color:#2563eb;display:block;margin-bottom:2px;">🔵 Your Live GPS Location</b>
          <span>Exact location detected</span>
        </div>
      `);
      userMarkerRef.current = userMarker;
    }
  }, [userCoords]);

  // Render Discovered Places Markers (Hotels, Cafes, Restaurants, Parks, Attractions)
  useEffect(() => {
    const placesGroup = placesLayerGroupRef.current;
    const map = mapRef.current;
    if (!placesGroup || !map) return;

    placesGroup.clearLayers();

    if (!places || places.length === 0) return;

    const categoryIcons: Record<string, { icon: string; bg: string; border: string }> = {
      hotel: { icon: "🏨", bg: "#e11d48", border: "#fda4af" },
      cafe: { icon: "☕", bg: "#d97706", border: "#fde68a" },
      restaurant: { icon: "🍽️", bg: "#ea580c", border: "#fed7aa" },
      park: { icon: "🌳", bg: "#16a34a", border: "#bbf7d0" },
      attraction: { icon: "🏛️", bg: "#7c3aed", border: "#ddd6fe" },
      hospital: { icon: "🏥", bg: "#0284c7", border: "#bae6fd" },
      other: { icon: "📍", bg: "#475569", border: "#cbd5e1" },
    };

    places.forEach((place) => {
      const isSelected = place.id === selectedPlaceId;
      const catConfig = categoryIcons[place.category] || categoryIcons.other;

      const placeIcon = L.divIcon({
        className: "custom-place-pin",
        html: `
          <div style="position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform 0.2s ease;">
            ${isSelected ? `<div style="position:absolute;width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.4);animation:ping 1.5s infinite;"></div>` : ""}
            <div style="
              display:flex;align-items:center;gap:4px;
              background:${catConfig.bg};
              color:#fff;
              border:2px solid ${isSelected ? "#ffffff" : catConfig.border};
              padding:3px 7px;
              border-radius:20px;
              box-shadow:0 4px 12px rgba(0,0,0,0.5);
              font-family:system-ui,-apple-system,sans-serif;
              font-size:11px;
              font-weight:700;
              white-space:nowrap;
              transform:${isSelected ? "scale(1.15)" : "scale(1)"};
            ">
              <span>${catConfig.icon}</span>
              <span style="max-width:110px;overflow:hidden;text-overflow:ellipsis;">${place.name}</span>
              <span style="background:rgba(0,0,0,0.25);padding:1px 4px;border-radius:8px;font-size:10px;">⭐${place.rating}</span>
            </div>
          </div>
        `,
        iconSize: [140, 32],
        iconAnchor: [70, 16],
      });

      const m = L.marker([place.lat, place.lng], { icon: placeIcon });

      const popupContent = `
        <div style="font-family:system-ui,-apple-system,sans-serif;padding:6px;max-width:220px;color:#111;">
          <div style="display:flex;align-items:center;gap:4px;margin-bottom:3px;">
            <span style="font-size:14px;">${catConfig.icon}</span>
            <b style="font-size:13px;line-height:1.2;color:#111;">${place.name}</b>
          </div>
          <div style="font-size:11px;color:#059669;font-weight:600;margin-bottom:3px;">
            ⭐ ${place.rating} (${place.reviewsCount.toLocaleString()} Google Reviews) • ${place.priceLevel}
          </div>
          <div style="font-size:10px;color:#6b7280;line-height:1.3;margin-bottom:6px;">
            ${place.address}
          </div>
          <button id="btn-select-${place.id}" style="
            width:100%;padding:4px 8px;border-radius:8px;background:#D95B26;color:#fff;border:none;font-size:11px;font-weight:700;cursor:pointer;
          ">
            View Details & Photos
          </button>
        </div>
      `;

      m.bindPopup(popupContent);

      m.on("popupopen", () => {
        const btn = document.getElementById(`btn-select-${place.id}`);
        if (btn) {
          btn.onclick = () => {
            if (onSelectPlace) onSelectPlace(place);
          };
        }
      });

      m.on("click", () => {
        if (onSelectPlace) onSelectPlace(place);
      });

      placesGroup.addLayer(m);

      if (isSelected) {
        m.openPopup();
      }
    });
  }, [places, selectedPlaceId, onSelectPlace]);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        backgroundColor: "#0a0a0c",
      }}
    >
      {/* Real Leaflet Map DOM Root */}
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "100%",
          zIndex: 1,
        }}
      />
    </div>
  );
}
