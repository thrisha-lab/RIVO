"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  CircleMarker,
  Circle,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTheme } from "next-themes";
import { Card } from "@/components/ui/card";
import { HAZARD_ICON, HAZARD_LABEL, SAFE_STOP_ICON } from "@/lib/api-client";
import type { HazardItem, SafeStopItem, RiderPresence } from "@/lib/types";
import { Users, Info, X, Flame, CloudRain } from "lucide-react";

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
  presence?: RiderPresence[];
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
    presence = [],
    onMapClick,
    onHazardClick,
    flyTo,
  } = props;
  const [showLegend, setShowLegend] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showRadar, setShowRadar] = useState(false);
  const { resolvedTheme } = useTheme();
  // Persist tile style preference across reloads (Phase 5).
  const [tileStyle, setTileStyle] = useState<"street" | "dark" | "satellite">(() => {
    if (typeof window === "undefined") return "street";
    const saved = window.localStorage.getItem("rg-tile-style");
    if (saved === "street" || saved === "dark" || saved === "satellite") return saved;
    return "street";
  });

  const handleTileChange = (s: "street" | "dark" | "satellite") => {
    setTileStyle(s);
    try { window.localStorage.setItem("rg-tile-style", s); } catch { /* ignore */ }
  };

  // Sync tile style with theme by default (user can override via the map control).
  const isDark = resolvedTheme === "dark";
  const effectiveTile = tileStyle === "street" && isDark ? "dark" : tileStyle;

  const tileConfig = {
    street: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      bg: "#e8eef3",
    },
    dark: {
      url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      bg: "#0f172a",
    },
    satellite: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: '&copy; Esri, Maxar, Earthstar Geographics',
      bg: "#1a1a1a",
    },
  };
  const tc = tileConfig[effectiveTile];

  const initialCenter: [number, number] = center ? [center.lat, center.lng] : [12.9719, 77.6412];

  const flyTarget = useMemo<[number, number] | null>(
    () => (flyTo ? [flyTo.lat, flyTo.lng] : null),
    [flyTo],
  );

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border bg-muted/30">
      <style>{`
        @keyframes rg-pulse { 0%{transform:scale(.6);opacity:.5} 70%{transform:scale(2.2);opacity:0} 100%{opacity:0} }
        .leaflet-container { font-family: inherit; background:${tc.bg}; transition: background .3s ease; }
        .leaflet-popup-content-wrapper { border-radius:10px; }
        .leaflet-tile { transition: filter .3s ease; }
      `}</style>
      <MapContainer center={initialCenter} zoom={zoom} className="h-full w-full" scrollWheelZoom>
        <TileLayer key={effectiveTile} attribution={tc.attribution} url={tc.url} />
        {/* RainViewer precipitation radar overlay */}
        {showRadar && (
          <TileLayer
            key="radar"
            url="https://tile.rainviewer.com/v2/radar/{z}/{x}/{y}/2/1_1.png"
            opacity={0.6}
            attribution="&copy; RainViewer"
            zIndex={1000}
          />
        )}
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
            {/* White casing for contrast */}
            <Polyline positions={routeGeometry.map((p) => [p.lat, p.lng] as [number, number])} pathOptions={{ color: "#ffffff", weight: 10, opacity: 0.5, lineCap: "round" }} />
            {/* Main route line */}
            <Polyline positions={routeGeometry.map((p) => [p.lat, p.lng] as [number, number])} pathOptions={{ color: "#0ea5e9", weight: 5, opacity: 0.9, lineCap: "round" }} />
            {/* Direction arrows overlay */}
            <Polyline positions={routeGeometry.map((p) => [p.lat, p.lng] as [number, number])} pathOptions={{ color: "#ffffff", weight: 1, opacity: 0.6, dashArray: "1 12", lineCap: "round" }} />
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

        {/* Heatmap overlay: semi-transparent circles around hazard clusters */}
        {showHeatmap && hazards.map((h) => {
          const sev = SEVERITY_COLOR[h.severity] ?? "#64748b";
          const radius = h.severity === "critical" ? 250 : h.severity === "high" ? 200 : h.severity === "moderate" ? 150 : 100;
          return (
            <Circle
              key={`heat-${h.id}`}
              center={[h.lat, h.lng]}
              radius={radius}
              pathOptions={{ color: sev, fillColor: sev, fillOpacity: 0.15, weight: 0 }}
            />
          );
        })}

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

        {/* Nearby riders (presence) — small dots */}
        {presence.map((r) => (
          <CircleMarker
            key={r.riderId}
            center={[r.lat, r.lng]}
            radius={6}
            pathOptions={{
              color: r.sosActive ? "#ef4444" : "#8b5cf6",
              fillColor: r.sosActive ? "#ef4444" : "#8b5cf6",
              fillOpacity: 0.6,
              weight: 2,
            }}
          >
            <Popup>
              <div className="space-y-0.5 text-xs">
                <div className="font-semibold">{r.displayName}</div>
                {r.sosActive && <div className="font-bold text-red-600">⚠ SOS ACTIVE</div>}
                <div className="text-muted-foreground">Nearby rider (live)</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Tap hint */}
      <div className="pointer-events-none absolute bottom-2 left-2 z-[500]">
        <Card className="pointer-events-auto px-2 py-1 text-[10px] text-muted-foreground shadow-sm">
          Tap map to set destination
        </Card>
      </div>

      {/* Presence badge (top-left) */}
      {presence.length > 0 && (
        <div className="pointer-events-none absolute left-2 top-2 z-[500]">
          <Card className="pointer-events-auto flex items-center gap-1.5 px-2.5 py-1 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500" />
            </span>
            <Users className="h-3 w-3 text-violet-500" />
            <span className="text-[11px] font-medium">{presence.length} rider{presence.length !== 1 ? "s" : ""} online nearby</span>
          </Card>
        </div>
      )}

      {/* Radar + Heatmap + Legend toggle (top-right) */}
      <div className="absolute right-2 top-2 z-[500] flex items-center gap-1.5">
        {/* Radar toggle */}
        <button
          type="button"
          onClick={() => setShowRadar((v) => !v)}
          aria-label="Toggle precipitation radar"
          aria-pressed={showRadar}
          className={`pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-md border shadow-sm backdrop-blur transition ${
            showRadar ? "border-sky-400 bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-400" : "bg-background/90 text-foreground hover:bg-accent"
          }`}
        >
          <CloudRain className="h-4 w-4" />
        </button>
        {/* Heatmap toggle */}
        <button
          type="button"
          onClick={() => setShowHeatmap((v) => !v)}
          aria-label="Toggle hazard heatmap"
          aria-pressed={showHeatmap}
          className={`pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-md border shadow-sm backdrop-blur transition ${
            showHeatmap ? "border-orange-400 bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400" : "bg-background/90 text-foreground hover:bg-accent"
          }`}
        >
          <Flame className="h-4 w-4" />
        </button>
        <div className="pointer-events-auto flex items-center gap-0.5 rounded-md border bg-background/90 p-0.5 shadow-sm backdrop-blur">
          {(["street", "dark", "satellite"] as const).map((s) => {
            const labels = { street: "Map", dark: "Dark", satellite: "Sat" };
            const active = effectiveTile === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => handleTileChange(s)}
                aria-label={`Switch to ${labels[s]} tiles`}
                aria-pressed={active}
                className={`rounded px-1.5 py-1 text-[10px] font-medium transition ${
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {labels[s]}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setShowLegend((v) => !v)}
          aria-label="Toggle map legend"
          className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background/90 shadow-sm backdrop-blur transition hover:bg-accent"
        >
          <Info className="h-4 w-4" />
        </button>
        {showLegend && (
          <Card className="absolute right-0 top-9 w-48 p-3 text-xs shadow-lg">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold">Legend</span>
              <button onClick={() => setShowLegend(false)} aria-label="Close legend"><X className="h-3 w-3" /></button>
            </div>
            <div className="space-y-1.5">
              <LegendRow color="#0ea5e9" label="Your location" glyph="◎" />
              <LegendRow color="#dc2626" label="Destination" glyph="📍" />
              <LegendRow color="#0ea5e9" label="Route" glyph="━" />
              <LegendRow color="#ef4444" label="Critical hazard" glyph="🔴" />
              <LegendRow color="#f97316" label="High hazard" glyph="🟠" />
              <LegendRow color="#f59e0b" label="Moderate hazard" glyph="🟡" />
              <LegendRow color="#10b981" label="Safe stop" glyph="🛡️" />
              <LegendRow color="#8b5cf6" label="Rider online" glyph="●" />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function LegendRow({ color, label, glyph }: { color: string; label: string; glyph: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-4 w-4 items-center justify-center text-[10px] font-bold" style={{ color }}>{glyph}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
