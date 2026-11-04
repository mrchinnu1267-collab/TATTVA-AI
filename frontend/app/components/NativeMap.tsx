"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface NativeMapProps {
  lat: number;
  lng: number;
  zoom?: number;
  mode?: "roadmap" | "satellite";
  label?: string;
  onMapClick?: (lat: number, lng: number) => void;
  onModeChange?: (mode: "roadmap" | "satellite") => void;
}

export default function NativeMap({
  lat,
  lng,
  zoom = 15,
  mode = "satellite",
  label = "Location",
  onMapClick,
  onModeChange,
}: NativeMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [currentMode, setCurrentMode] = useState<"roadmap" | "satellite">(mode);

  // Sync internal state with prop if updated from outside
  useEffect(() => {
    setCurrentMode(mode);
  }, [mode]);

  // Construct high-reliability tile layer using our local /api/map/tile proxy
  const createTileLayer = useCallback((tileMode: "roadmap" | "satellite") => {
    // Primary: Local application API tile proxy (100% immune to CSP, CORS, and Referer blocking)
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

    // In case local proxy hits any network edge case, fallback to public ESRI / OSM tile
    layer.on("tileerror", function (error: any) {
      const tile = error.tile;
      if (tile && !tile.dataset.retried) {
        tile.dataset.retried = "true";
        if (tileMode === "satellite") {
          // Direct fallback to ESRI World Imagery Satellite
          tile.src = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${error.coords.z}/${error.coords.y}/${error.coords.x}`;
        } else {
          tile.src = `https://tile.openstreetmap.org/${error.coords.z}/${error.coords.x}/${error.coords.y}.png`;
        }
      }
    });

    return layer;
  }, []);

  // Initialize Map on mount
  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;

    // Fix Leaflet container positioning
    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: zoom,
      zoomControl: false, // We render sleek custom floating controls
      attributionControl: true,
    });
    mapRef.current = map;

    // Immediately add initial tile layer
    const initialLayer = createTileLayer(currentMode);
    initialLayer.addTo(map);
    tileLayerRef.current = initialLayer;

    // Custom Glowing Pin (Emerald Beacon with pulse)
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
    markerRef.current = marker;

    const popupHtml = `
      <div style="font-family:system-ui,-apple-system,sans-serif;padding:4px 6px;font-size:13px;line-height:1.4;color:#111;">
        <b style="font-size:13px;color:#059669;display:block;margin-bottom:2px;">📍 ${label}</b>
        <span style="color:#6b7280;font-size:11px;">Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}</span>
      </div>
    `;
    marker.bindPopup(popupHtml).openPopup();

    // Map click handler for reverse geocoding
    map.on("click", (e: L.LeafletMouseEvent) => {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    });

    // Invalidate size immediately and after key UI animation timestamps
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 50);
    const t2 = setTimeout(() => map.invalidateSize(), 200);
    const t3 = setTimeout(() => map.invalidateSize(), 500);
    const t4 = setTimeout(() => map.invalidateSize(), 1000);

    // Continuous ResizeObserver so map never renders black/grey box
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      ro = new ResizeObserver(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      });
      ro.observe(containerRef.current);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
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

  // Update Coordinates and Marker when lat/lng/label change
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    map.flyTo([lat, lng], zoom, { duration: 1.2 });
    marker.setLatLng([lat, lng]);

    const popupHtml = `
      <div style="font-family:system-ui,-apple-system,sans-serif;padding:4px 6px;font-size:13px;line-height:1.4;color:#111;">
        <b style="font-size:13px;color:#059669;display:block;margin-bottom:2px;">📍 ${label}</b>
        <span style="color:#6b7280;font-size:11px;">Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}</span>
      </div>
    `;
    marker.setPopupContent(popupHtml).openPopup();
    map.invalidateSize();
  }, [lat, lng, zoom, label]);

  // Handlers for on-map floating action controls
  const handleZoomIn = () => {
    if (mapRef.current) mapRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapRef.current) mapRef.current.zoomOut();
  };

  const handleRecenter = () => {
    if (mapRef.current) {
      mapRef.current.flyTo([lat, lng], zoom, { duration: 0.8 });
      if (markerRef.current) markerRef.current.openPopup();
    }
  };

  const toggleMode = () => {
    const nextMode = currentMode === "satellite" ? "roadmap" : "satellite";
    setCurrentMode(nextMode);
    if (onModeChange) onModeChange(nextMode);
  };

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

      {/* Floating On-Map Glass Controls (Top-Right) */}
      <div
        style={{
          position: "absolute",
          top: 14,
          right: 14,
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {/* Satellite vs Street Map Mode Toggle */}
        <button
          type="button"
          onClick={toggleMode}
          title={currentMode === "satellite" ? "Switch to Road Map" : "Switch to Real Satellite View"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 12px",
            borderRadius: "14px",
            background: "rgba(18, 19, 22, 0.85)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            color: "#ffffff",
            fontSize: "12px",
            fontWeight: "700",
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
            userSelect: "none",
          }}
        >
          <span style={{ fontSize: "14px" }}>{currentMode === "satellite" ? "🛰️" : "🗺️"}</span>
          <span>{currentMode === "satellite" ? "Satellite" : "Road Map"}</span>
        </button>

        {/* Zoom Controls */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            borderRadius: "14px",
            background: "rgba(18, 19, 22, 0.85)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            overflow: "hidden",
            boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
          }}
        >
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom In"
            style={{
              padding: "8px 10px",
              color: "#ffffff",
              background: "transparent",
              border: "none",
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "bold",
              lineHeight: 1,
            }}
          >
            +
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom Out"
            style={{
              padding: "8px 10px",
              color: "#ffffff",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "bold",
              lineHeight: 1,
            }}
          >
            −
          </button>
        </div>

        {/* Recenter Pin Button */}
        <button
          type="button"
          onClick={handleRecenter}
          title="Recenter Map Pin"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "36px",
            height: "36px",
            borderRadius: "14px",
            background: "rgba(18, 19, 22, 0.85)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            color: "#10b981",
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polygon points="12 8 8 12 12 16 12 8" />
          </svg>
        </button>
      </div>
    </div>
  );
}
