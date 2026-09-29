"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  CircleMarker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card } from "@/components/ui/card";
import { HAZARD_ICON, HAZARD_LABEL, SAFE_STOP_ICON } from "@/lib/api-client";
import type { HazardItem, SafeStopItem } from "@/lib/types";

// Fix default marker icons (Leaflet bundling quirk).
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function makeIcon(color: string, glyph = ""): L.DivIcon {
  return L.divIcon({
    className: "rg-marker",
    html: `<div style="
      width:28px;height:28px;border-radius:50% 50% 50% 0;
      background:${color};transform:rotate(-45deg);
      box-shadow:0 2px 6px rgba(0,0,0,.35);border:2px solid #fff;
      display:flex;align-items:center;justify-content:center;">
      <span style="transform:rotate(45deg);font-size:13px;line-height:1;">${glyph}</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -26],
  });
}

function currentLocationIcon(): L.DivIcon {
  return L.divIcon({
    className: "rg-loc",
    html: `<div style="position:relative;width:22px;height:22px;">
      <div style="position:absolute;inset:0;border-radius:50%;background:#0ea5e9;opacity:.25;animation:rg-pulse 2s infinite;"></div>
      <div style="position:absolute;inset:5px;border-radius:50%;background:#0ea5e9;border:2px solid #fff;box-shadow:0 0 0 2px rgba(14,165,233,.4);"></div>
    </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function FlyTo({ center, zoom }: { center: [number, number] | null; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom ?? map.getZoom(), { duration: 0.8 });
  }, [center, zoom, map]);
  return null;
}

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

const SEVERITY_COLOR: Record<string, string> = {
  low: "#10b981",
  moderate: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
};

export interface RiderMapProps {
  center: { lat: number; lng: number } | null;
  zoom?: number;
  currentLocation: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number; label?: string } | null;
  routeGeometry: { lat: number; lng: number }[] | null;
  hazards: HazardItem[];
  safeStops: SafeStopItem[];
  onMapClick: (lat: number, lng: number) => void;
  onHazardClick?: (id: string) => void;
  flyTo: { lat: number; lng: number; zoom?: number } | null;
}

export default function RiderMap(props: RiderMapProps) {
  const {
    center,
    zoom = 13,
    currentLocation,
    destination,
    routeGeometry,
    hazards,
    safeStops,
    onMapClick,
    onHazardClick,
    flyTo,
  } = props;

  const initialCenter: [number, number] = center ? [center.lat, center.lng] : [12.9719, 77.6412];

  const flyTarget = useMemo<[number, number] | null>(
    () => (flyTo ? [flyTo.lat, flyTo.lng] : null),
    [flyTo],
  );

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border bg-muted/30">
      <style>{`
        @keyframes rg-pulse { 0%{transform:scale(.6);opacity:.5} 70%{transform:scale(2.2);opacity:0} 100%{opacity:0} }
        .leaflet-container { font-family: inherit; background:#e8eef3; }
        .leaflet-popup-content-wrapper { border-radius:10px; }
      `}</style>
      <MapContainer center={initialCenter} zoom={zoom} className="h-full w-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onClick={onMapClick} />
        <FlyTo center={flyTarget} zoom={flyTo?.zoom} />

        {currentLocation && (
          <Marker position={[currentLocation.lat, currentLocation.lng]} icon={currentLocationIcon()}>
            <Popup>You are here</Popup>
          </Marker>
        )}

        {destination && (
          <Marker
            position={[destination.lat, destination.lng]}
            icon={makeIcon("#dc2626", "📍")}
          >
            <Popup>{destination.label ?? "Destination"}</Popup>
          </Marker>
        )}

        {routeGeometry && routeGeometry.length > 1 && (
          <>
            <Polyline positions={routeGeometry.map((p) => [p.lat, p.lng] as [number, number])} pathOptions={{ color: "#0ea5e9", weight: 5, opacity: 0.85 }} />
            <Polyline positions={routeGeometry.map((p) => [p.lat, p.lng] as [number, number])} pathOptions={{ color: "#fff", weight: 9, opacity: 0.4 }} />
          </>
        )}

        {hazards.map((h) => (
          <Marker
            key={h.id}
            position={[h.lat, h.lng]}
            icon={makeIcon(SEVERITY_COLOR[h.severity] ?? "#64748b", HAZARD_ICON[h.type] ?? "❗")}
            eventHandlers={{ click: () => onHazardClick?.(h.id) }}
          >
            <Popup>
              <div className="space-y-1">
                <div className="font-semibold text-sm">
                  {HAZARD_LABEL[h.type] ?? h.type}
                  {h.verified && <span className="ml-1 text-emerald-600">✓ verified</span>}
                </div>
                {h.description && <div className="text-xs text-muted-foreground">{h.description}</div>}
                <div className="text-xs">
                  {h.confirmCount} confirm · {h.disputeCount} dispute
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {safeStops.map((s) => (
          <Marker key={s.id} position={[s.lat, s.lng]} icon={makeIcon("#16a34a", SAFE_STOP_ICON[s.type] ?? "🛡️")}>
            <Popup>
              <div className="space-y-1">
                <div className="font-semibold text-sm">{s.name}</div>
                {s.address && <div className="text-xs text-muted-foreground">{s.address}</div>}
                {s.hours && <div className="text-xs">🕒 {s.hours}</div>}
                {s.amenities && <div className="text-xs">amenities: {s.amenities}</div>}
                <div className="text-xs">★ {s.rating.toFixed(1)}</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <div className="pointer-events-none absolute bottom-2 left-2 z-[500]">
        <Card className="pointer-events-auto px-2 py-1 text-[10px] text-muted-foreground shadow-sm">
          Tap map to set destination
        </Card>
      </div>
    </div>
  );
}
