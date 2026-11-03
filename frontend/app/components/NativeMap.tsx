"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface NativeMapProps {
  lat: number;
  lng: number;
  zoom?: number;
  mode: "roadmap" | "satellite";
  label?: string;
  onMapClick?: (lat: number, lng: number) => void;
}

export default function NativeMap({
  lat,
  lng,
  zoom = 14,
  mode,
  label = "Location",
  onMapClick,
}: NativeMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Initialize Map on mount
  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;

    // Create Leaflet map instance
    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: zoom,
      zoomControl: true,
      attributionControl: true,
    });
    mapRef.current = map;

    // Custom Emerald Glowing Pin
    const pinIcon = L.divIcon({
      className: "custom-map-pin",
      html: `<div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:#10b981;box-shadow:0 0 16px rgba(16,185,129,0.7);border:2.5px solid #ffffff;color:#fff;cursor:pointer;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -36],
    });

    const marker = L.marker([lat, lng], { icon: pinIcon }).addTo(map);
    markerRef.current = marker;

    const popupHtml = `<div style="font-family:sans-serif;padding:2px 4px;font-size:13px;line-height:1.4;">
      <b style="color:#fff;">${label}</b><br/>
      <span style="color:#9ca3af;font-size:11px;">${lat.toFixed(4)}, ${lng.toFixed(4)}</span>
    </div>`;
    marker.bindPopup(popupHtml).openPopup();

    // Map click handler to select arbitrary points
    map.on("click", (e: L.LeafletMouseEvent) => {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    });

    // Invalidate size once DOM stabilizes
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
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

    if (mode === "satellite") {
      const satLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 19,
          attribution: "&copy; Esri World Imagery",
        }
      );
      satLayer.addTo(map);
      tileLayerRef.current = satLayer;
    } else {
      const osmLayer = L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
        }
      );
      osmLayer.addTo(map);
      tileLayerRef.current = osmLayer;
    }
  }, [mode]);

  // Update Coordinates and Marker when lat/lng/label change
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    map.flyTo([lat, lng], zoom, { duration: 1.2 });
    marker.setLatLng([lat, lng]);

    const popupHtml = `<div style="font-family:sans-serif;padding:2px 4px;font-size:13px;line-height:1.4;">
      <b style="color:#fff;">${label}</b><br/>
      <span style="color:#9ca3af;font-size:11px;">${lat.toFixed(4)}, ${lng.toFixed(4)}</span>
    </div>`;
    marker.setPopupContent(popupHtml).openPopup();

    map.invalidateSize();
  }, [lat, lng, zoom, label]);

  return (
    <div className="relative w-full h-full min-h-[300px]">
      <div ref={containerRef} className="w-full h-full z-0" />
      <style jsx global>{`
        .leaflet-container {
          background-color: #121316 !important;
          font-family: inherit;
        }
        .leaflet-popup-content-wrapper {
          background: #1e1f23 !important;
          color: #f3f4f6 !important;
          border-radius: 14px !important;
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5) !important;
        }
        .leaflet-popup-tip {
          background: #1e1f23 !important;
        }
        .leaflet-bar {
          border: none !important;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4) !important;
          border-radius: 12px !important;
          overflow: hidden;
        }
        .leaflet-bar a {
          background: #1e1f23 !important;
          color: #ffffff !important;
          border-bottom: 1px solid #333333 !important;
        }
        .leaflet-bar a:hover {
          background: #2d3036 !important;
        }
      `}</style>
    </div>
  );
}

