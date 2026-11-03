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

  // Helper to construct high-performance Google Maps & ESRI tiles
  function createTileLayer(tileMode: "roadmap" | "satellite") {
    if (tileMode === "satellite") {
      // Google Hybrid Satellite Tiles (satellite imagery with road labels)
      return L.tileLayer("https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
        subdomains: ["0", "1", "2", "3"],
        maxZoom: 20,
        attribution: "&copy; Google Maps Satellite",
      });
    }

    // Google Vector Roadmap Tiles (clear, beautiful, high-speed global CDN)
    return L.tileLayer("https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
      subdomains: ["0", "1", "2", "3"],
      maxZoom: 20,
      attribution: "&copy; Google Maps",
    });
  }

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

    // Immediately add the tile layer
    const layer = createTileLayer(mode);
    layer.addTo(map);
    tileLayerRef.current = layer;

    // Custom Glowing Pin
    const pinIcon = L.divIcon({
      className: "custom-map-pin",
      html: `<div style="display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:50%;background:#10b981;box-shadow:0 0 18px rgba(16,185,129,0.8);border:2.5px solid #ffffff;color:#fff;cursor:pointer;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>`,
      iconSize: [38, 38],
      iconAnchor: [19, 38],
      popupAnchor: [0, -38],
    });

    const marker = L.marker([lat, lng], { icon: pinIcon }).addTo(map);
    markerRef.current = marker;

    const popupHtml = `<div style="font-family:sans-serif;padding:3px 5px;font-size:13px;line-height:1.4;">
      <b style="color:#ffffff;">${label}</b><br/>
      <span style="color:#9ca3af;font-size:11px;">Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}</span>
    </div>`;
    marker.bindPopup(popupHtml).openPopup();

    // Map click handler
    map.on("click", (e: L.LeafletMouseEvent) => {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    });

    // Invalidate size immediately and after mount intervals
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 50);
    const t2 = setTimeout(() => map.invalidateSize(), 200);
    const t3 = setTimeout(() => map.invalidateSize(), 600);

    // ResizeObserver ensures map always adapts when modal expands or rotates
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      ro = new ResizeObserver(() => {
        map.invalidateSize();
      });
      ro.observe(containerRef.current);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
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

    const newLayer = createTileLayer(mode);
    newLayer.addTo(map);
    tileLayerRef.current = newLayer;
    map.invalidateSize();
  }, [mode]);

  // Update Coordinates and Marker when lat/lng/label change
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    map.flyTo([lat, lng], zoom, { duration: 1.2 });
    marker.setLatLng([lat, lng]);

    const popupHtml = `<div style="font-family:sans-serif;padding:3px 5px;font-size:13px;line-height:1.4;">
      <b style="color:#ffffff;">${label}</b><br/>
      <span style="color:#9ca3af;font-size:11px;">Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}</span>
    </div>`;
    marker.setPopupContent(popupHtml).openPopup();

    map.invalidateSize();
  }, [lat, lng, zoom, label]);

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
        backgroundColor: "#121316",
      }}
    >
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
