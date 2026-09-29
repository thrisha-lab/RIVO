"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import {
  Bike,
  Loader2,
  Navigation,
  X,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Route as RouteIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/theme-provider";
import DestinationSearch from "@/components/destination-search";
import GpsControls from "@/components/gps-controls";
import RiskDashboard from "@/components/risk-dashboard";
import WeatherCard from "@/components/weather-card";
import HazardReportForm from "@/components/hazard-report-form";
import CommunityFeed from "@/components/community-feed";
import SafeStopsList from "@/components/safe-stops-list";
import AiExplanationPanel from "@/components/ai-explanation-panel";
import { api, RISK_META } from "@/lib/api-client";
import type {
  RiskAssessmentData,
  HazardItem,
  SafeStopItem,
  FeedItem,
  AIExplanation,
  RiderIdentity,
} from "@/lib/types";

// Leaflet is client-only; load the map lazily.
const RiderMap = dynamic(() => import("@/components/rider-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center rounded-xl border bg-muted/30">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

interface Loc {
  lat: number;
  lng: number;
  accuracy?: number;
}

export default function Home() {
  const [rider, setRider] = React.useState<RiderIdentity | null>(null);
  const [currentLocation, setCurrentLocation] = React.useState<Loc | null>(null);
  const [permission, setPermission] = React.useState<"idle" | "granted" | "denied" | "unavailable">("idle");
  const [tracking, setTracking] = React.useState(false);
  const watchId = React.useRef<number | null>(null);

  const [destination, setDestination] = React.useState<{ lat: number; lng: number; label: string } | null>(null);
  const [pinLocation, setPinLocation] = React.useState<Loc | null>(null);
  const [recentDestinations, setRecentDestinations] = React.useState<{ id: string; label: string; lat: number; lng: number }[]>([]);

  const [risk, setRisk] = React.useState<RiskAssessmentData | null>(null);
  const [riskLoading, setRiskLoading] = React.useState(false);
  const [weatherDesc, setWeatherDesc] = React.useState<string | undefined>();

  const [hazards, setHazards] = React.useState<HazardItem[]>([]);
  const [safeStops, setSafeStops] = React.useState<SafeStopItem[]>([]);
  const [feed, setFeed] = React.useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = React.useState(false);
  const [stopsLoading, setStopsLoading] = React.useState(false);
  const [hazardsLoading, setHazardsLoading] = React.useState(false);

  const [aiExplanation, setAiExplanation] = React.useState<AIExplanation | null>(null);
  const [aiLoading, setAiLoading] = React.useState(false);

  const [flyTo, setFlyTo] = React.useState<{ lat: number; lng: number; zoom?: number } | null>(null);

  // Resolve anonymous rider identity on mount (sets the httpOnly cookie).
  React.useEffect(() => {
    api
      .rider()
      .then((r) => {
        setRider(r);
        if (r.isNew) toast.success(`Welcome, ${r.displayName}! Your anonymous rider ID is ready.`);
      })
      .catch(() => {
        /* ignore — anonymous browsing still allowed */
      });
  }, []);

  // Load nearby intel whenever current location changes.
  const loadNearby = React.useCallback(async (loc: Loc) => {
    setHazardsLoading(true);
    setStopsLoading(true);
    setFeedLoading(true);
    try {
      const [h, s, f] = await Promise.all([
        api.hazards(loc.lat, loc.lng, 2000),
        api.safeStops(loc.lat, loc.lng, 4000),
        api.feed(loc.lat, loc.lng, 6000),
      ]);
      setHazards(h.hazards);
      setSafeStops(s.stops);
      setFeed(f.feed);
    } catch {
      /* swallow */
    } finally {
      setHazardsLoading(false);
      setStopsLoading(false);
      setFeedLoading(false);
    }
  }, []);

  const computeRisk = React.useCallback(
    async (origin: Loc, dest: { lat: number; lng: number; label?: string }) => {
      setRiskLoading(true);
      setAiExplanation(null);
      try {
        const r = await api.risk(origin, dest);
        setRisk(r);
        setWeatherDesc(undefined);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Risk assessment failed");
      } finally {
        setRiskLoading(false);
      }
    },
    [],
  );

  // Recompute risk when both origin & destination are set.
  React.useEffect(() => {
    if (currentLocation && destination) {
      computeRisk(currentLocation, destination);
    } else if (!destination) {
      setRisk(null);
      setAiExplanation(null);
    }
  }, [currentLocation, destination, computeRisk]);

  // Reload nearby intel when current location changes.
  React.useEffect(() => {
    if (currentLocation) loadNearby(currentLocation);
  }, [currentLocation, loadNearby]);

  // ----- GPS handling -----
  const startTracking = React.useCallback(() => {
    if (!("geolocation" in navigator)) {
      setPermission("unavailable");
      toast.error("Geolocation not supported by this browser.");
      return;
    }
    navigator.permissions?.query({ name: "geolocation" as PermissionName }).then((res) => {
      if (res.state === "denied") setPermission("denied");
    }).catch(() => { /* ignore */ });

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setPermission("granted");
        const loc: Loc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setCurrentLocation(loc);
        // push to backend session
        api.pushGps({ lat: loc.lat, lng: loc.lng, accuracy: loc.accuracy }).catch(() => {});
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setPermission("denied");
          toast.error("Location permission denied.");
        } else {
          toast.error("Could not get your location.");
        }
        setTracking(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    watchId.current = id;
    setTracking(true);
    // start a backend session
    api
      .startTracking({ destLat: destination?.lat, destLng: destination?.lng, destLabel: destination?.label })
      .catch(() => {});
    toast.success("Live GPS tracking started.");
  }, [destination]);

  const stopTracking = React.useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setTracking(false);
    api.endTracking().catch(() => {});
    toast("Tracking stopped. Session saved.", { icon: "🛑" });
  }, []);

  const locateOnce = React.useCallback(() => {
    if (!("geolocation" in navigator)) {
      setPermission("unavailable");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPermission("granted");
        const loc: Loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
        setCurrentLocation(loc);
        setFlyTo({ lat: loc.lat, lng: loc.lng, zoom: 15 });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setPermission("denied");
        toast.error("Could not get your location.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  const onMapClick = React.useCallback(async (lat: number, lng: number) => {
    setPinLocation({ lat, lng });
    setDestination({ lat, lng, label: "Map pin" });
    setFlyTo({ lat, lng, zoom: 15 });
  }, []);

  const onDestinationSelect = React.useCallback((r: { lat: number; lng: number; label: string }) => {
    setDestination(r);
    setPinLocation(null);
    setFlyTo({ lat: r.lat, lng: r.lng, zoom: 14 });
  }, []);

  const refreshFeed = React.useCallback(() => {
    if (currentLocation) loadNearby(currentLocation);
  }, [currentLocation, loadNearby]);

  const explain = React.useCallback(async () => {
    if (!risk) return;
    setAiLoading(true);
    try {
      const res = await api.explain({
        risk,
        originLabel: "Your location",
        destLabel: destination?.label,
      });
      setAiExplanation(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI explanation failed");
    } finally {
      setAiLoading(false);
    }
  }, [risk, destination]);

  const routeGeometry = risk?.route?.geometry ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-[600] border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-3 sm:px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-emerald-500 text-white shadow-sm">
              <Bike className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-tight">RiderGuard</div>
              <div className="hidden text-[10px] text-muted-foreground sm:block">AI weather safety co-pilot</div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {rider && (
              <Badge variant="secondary" className="gap-1">
                <ShieldCheck className="h-3 w-3" />
                {rider.displayName}
                <span className="ml-1 rounded bg-amber-400/20 px-1 text-[10px] font-bold text-amber-700 dark:text-amber-300">★{rider.reputation}</span>
              </Badge>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-3 py-3 sm:px-4 sm:py-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_420px]">
          {/* LEFT: map + search + controls */}
          <section className="flex flex-col gap-3">
            <DestinationSearch onSelect={onDestinationSelect} recent={recentDestinations} />

            <div className="relative h-[44vh] min-h-[320px] w-full lg:h-[calc(100vh-220px)] lg:max-h-[760px]">
              <RiderMap
                center={currentLocation}
                currentLocation={currentLocation}
                destination={destination}
                routeGeometry={routeGeometry}
                hazards={hazards}
                safeStops={safeStops}
                onMapClick={onMapClick}
                onHazardClick={(id) => {
                  const h = hazards.find((x) => x.id === id);
                  if (h) setFlyTo({ lat: h.lat, lng: h.lng, zoom: 16 });
                }}
                flyTo={flyTo}
              />
              {destination && (
                <button
                  type="button"
                  onClick={() => {
                    setDestination(null);
                    setPinLocation(null);
                  }}
                  className="absolute right-2 top-2 z-[600] inline-flex items-center gap-1 rounded-md border bg-background/90 px-2 py-1 text-xs shadow-sm backdrop-blur hover:bg-accent"
                >
                  <X className="h-3 w-3" /> Clear destination
                </button>
              )}
            </div>

            <GpsControls
              tracking={tracking}
              currentLocation={currentLocation}
              permission={permission}
              onStart={startTracking}
              onStop={stopTracking}
              onLocate={locateOnce}
            />

            {risk?.route && (
              <Card className="p-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    <RouteIcon className="h-4 w-4 text-sky-600" /> Route summary
                  </div>
                  <Badge variant="outline" className="text-[10px] capitalize">{risk.route.source.replace("-", " ")}</Badge>
                </div>
                <div className="mt-1.5 flex items-center gap-4 text-xs text-muted-foreground">
                  <span>📏 {risk.route.distanceKm.toFixed(1)} km</span>
                  {risk.route.durationMin != null && <span>⏱ ~{risk.route.durationMin} min</span>}
                  <span>🛣 {routeGeometry ? `${routeGeometry.length} pts` : "—"}</span>
                </div>
              </Card>
            )}
          </section>

          {/* RIGHT: intelligence panels */}
          <aside className="flex flex-col gap-3">
            <RiskDashboard risk={risk} loading={riskLoading} onExplain={explain} explaining={aiLoading} />
            <WeatherCard
              weather={risk?.weather ?? null}
              description={weatherDesc}
              loading={riskLoading}
            />
            <AiExplanationPanel
              explanation={aiExplanation}
              loading={aiLoading}
              levelLabel={risk ? RISK_META[risk.level].label : undefined}
            />

            <Tabs defaultValue="feed" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="feed">Feed</TabsTrigger>
                <TabsTrigger value="stops">Safe stops</TabsTrigger>
                <TabsTrigger value="report">Report</TabsTrigger>
              </TabsList>
              <TabsContent value="feed" className="mt-3">
                <div className="mb-2 flex items-center justify-end">
                  <Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={refreshFeed}>
                    <RefreshCw className="h-3 w-3" /> Refresh
                  </Button>
                </div>
                <CommunityFeed
                  feed={feed}
                  loading={feedLoading}
                  center={currentLocation}
                  onVoteChange={refreshFeed}
                  onFocus={(lat, lng) => setFlyTo({ lat, lng, zoom: 16 })}
                />
              </TabsContent>
              <TabsContent value="stops" className="mt-3">
                <SafeStopsList
                  stops={safeStops}
                  loading={stopsLoading}
                  onFocus={(lat, lng) => setFlyTo({ lat, lng, zoom: 16 })}
                />
              </TabsContent>
              <TabsContent value="report" className="mt-3">
                <HazardReportForm
                  currentLocation={currentLocation}
                  pinLocation={pinLocation}
                  onCreated={refreshFeed}
                />
              </TabsContent>
            </Tabs>
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t bg-muted/30">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-2 px-4 py-3 text-xs text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            <span>Risk scores are deterministic. AI explains only — never overrides safety.</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Weather: Open-Meteo</span>
            <span>Maps: OpenStreetMap</span>
            <span>Routing: OSRM</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
