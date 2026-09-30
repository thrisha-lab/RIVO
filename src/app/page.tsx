"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Bike,
  Loader2,
  X,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Route as RouteIcon,
  Radio,
  ShieldCheck as StopsIcon,
  Siren,
  History,
  Trophy,
  BarChart3,
  Award,
  Settings as SettingsIcon,
  Keyboard,
  Share2,
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
import ForecastPanel from "@/components/forecast-panel";
import HistoryPanel from "@/components/history-panel";
import LeaderboardPanel from "@/components/leaderboard-panel";
import SosButton from "@/components/sos-button";
import FavoritesBar from "@/components/favorites-bar";
import AlertBell from "@/components/alert-bell";
import OnboardingModal from "@/components/onboarding-modal";
import RealtimeToasts from "@/components/realtime-toasts";
import StatsDashboard from "@/components/stats-dashboard";
import AchievementsPanel from "@/components/achievements-panel";
import HazardDetailModal from "@/components/hazard-detail-modal";
import SettingsPanel from "@/components/settings-panel";
import DeliveryImpactCard from "@/components/delivery-impact-card";
import VoiceAlertsToggle from "@/components/voice-alerts-toggle";
import KeyboardShortcutsOverlay from "@/components/keyboard-shortcuts-overlay";
import RouteComparison from "@/components/route-comparison";
import ShareTripSummary from "@/components/share-trip-summary";
import RideMode from "@/components/ride-mode";
import AirQualityCard from "@/components/air-quality-card";
import DaylightCard from "@/components/daylight-card";
import WindCompass from "@/components/wind-compass";
import UvIndexCard from "@/components/uv-index-card";
import HazardFilter, { type SeverityFilter } from "@/components/hazard-filter";
import QuickReportFab from "@/components/quick-report-fab";
import BottomNav from "@/components/bottom-nav";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/components/i18n-provider";
import { useRealtime } from "@/hooks/use-realtime";
import { useShakeToSos, requestMotionPermission } from "@/hooks/use-shake-to-sos";
import { useOnlineStatus, writeOfflineCache } from "@/hooks/use-offline-cache";
import { WifiOff } from "lucide-react";
import { api, RISK_META } from "@/lib/api-client";
import type {
  RiskAssessmentData,
  HazardItem,
  SafeStopItem,
  FeedItem,
  AIExplanation,
  RiderIdentity,
  FavoriteDestination,
  AirQualityInfo,
  DaylightInfo,
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
  const { t } = useI18n();
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
  // Standalone weather that loads immediately on GPS, before a destination is set.
  const [standaloneWeather, setStandaloneWeather] = React.useState<import("@/lib/types").WeatherInfo | null>(null);
  const [standaloneWeatherDesc, setStandaloneWeatherDesc] = React.useState<string | undefined>();
  const [standaloneWeatherLoading, setStandaloneWeatherLoading] = React.useState(false);
  // Reverse-geocoded readable address for the current position.
  const [currentAddress, setCurrentAddress] = React.useState<string | null>(null);
  // Phase 9: Air quality + daylight.
  const [airQuality, setAirQuality] = React.useState<AirQualityInfo | null>(null);
  const [airQualityLoading, setAirQualityLoading] = React.useState(false);
  const [daylight, setDaylight] = React.useState<DaylightInfo | null>(null);
  const [daylightLoading, setDaylightLoading] = React.useState(false);

  const [hazards, setHazards] = React.useState<HazardItem[]>([]);
  const [safeStops, setSafeStops] = React.useState<SafeStopItem[]>([]);
  const [feed, setFeed] = React.useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = React.useState(false);
  const [stopsLoading, setStopsLoading] = React.useState(false);
  const [hazardsLoading, setHazardsLoading] = React.useState(false);
  // Phase 10: Hazard filters
  const [activeTypeFilters, setActiveTypeFilters] = React.useState<Set<string>>(new Set());
  const [activeSeverityFilters, setActiveSeverityFilters] = React.useState<Set<SeverityFilter>>(new Set(["all"]));
  // Phase 11: Active tab for bottom nav sync
  const [activeTab, setActiveTab] = React.useState("feed");

  const [aiExplanation, setAiExplanation] = React.useState<AIExplanation | null>(null);
  const [aiLoading, setAiLoading] = React.useState(false);

  const [flyTo, setFlyTo] = React.useState<{ lat: number; lng: number; zoom?: number } | null>(null);

  const [onboardingDismissed, setOnboardingDismissed] = React.useState(false);
  const [selectedHazardId, setSelectedHazardId] = React.useState<string | null>(null);
  const [showSettings, setShowSettings] = React.useState(false);
  const [showShortcuts, setShowShortcuts] = React.useState(false);
  const [voiceEnabled, setVoiceEnabled] = React.useState(false);
  const [showShare, setShowShare] = React.useState(false);
  const [showRideMode, setShowRideMode] = React.useState(false);
  // Override route geometry when the user selects an alternative route.
  const [overrideGeometry, setOverrideGeometry] = React.useState<{ lat: number; lng: number }[] | null>(null);
  // Trip timer for ride mode.
  const [tripStart, setTripStart] = React.useState<number | null>(null);
  const [tripElapsed, setTripElapsed] = React.useState(0);

  // Real-time presence + hazard/SOS push via WebSocket mini-service (port 3003).
  const realtime = useRealtime({
    riderId: rider?.id ?? null,
    displayName: rider?.displayName ?? null,
    location: currentLocation,
    enabled: !!rider && !!currentLocation,
  });

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

  // Keyboard shortcuts (vim-style "g then X" + "?" for help overlay).
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (typing) return;

      // "?" opens shortcuts overlay
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShowShortcuts((v) => !v);
        return;
      }
      // Escape closes overlays
      if (e.key === "Escape") {
        setShowSettings(false);
        setShowShortcuts(false);
        setSelectedHazardId(null);
        setShowRideMode(false);
        return;
      }
      // "m" toggles ride mode
      if (e.key === "m" && !e.metaKey && !e.ctrlKey) {
        setShowRideMode((v) => !v);
        return;
      }

      // "g" prefix → wait for next key
      if (e.key === "g" && !e.metaKey && !e.ctrlKey) {
        const handler = (e2: KeyboardEvent) => {
          const tab = (val: string) => {
            const el = document.querySelector(`[role=tab][value=${val}]`) as HTMLElement | null;
            el?.scrollIntoView({ block: "center" });
            el?.click();
          };
          switch (e2.key) {
            case "s": setShowSettings(true); break;
            case "f": (document.querySelector('input[placeholder*="destination"]') as HTMLElement)?.focus(); break;
            case "r": tab("report"); break;
            case "h": tab("history"); break;
            case "b": tab("badges"); break;
            case "t": tab("board"); break;
          }
          window.removeEventListener("keydown", handler);
        };
        window.addEventListener("keydown", handler);
        setTimeout(() => window.removeEventListener("keydown", handler), 1200);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Trip timer: tick every second while ride mode is active.
  React.useEffect(() => {
    if (!showRideMode) {
      setTripStart(null);
      setTripElapsed(0);
      return;
    }
    if (tripStart === null) setTripStart(Date.now());
    const t = setInterval(() => {
      setTripElapsed(Math.floor((Date.now() - (tripStart ?? Date.now())) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [showRideMode, tripStart]);

  // Shake-to-SOS: opens the SOS modal when the phone is shaken.
  const handleShake = React.useCallback(() => {
    // Open the SOS button's modal by simulating a click.
    const sosBtn = document.querySelector('button[aria-label="Emergency SOS"]') as HTMLButtonElement | null;
    sosBtn?.click();
    toast("📱 Shake detected — SOS opened", { icon: "🚨" });
  }, []);
  useShakeToSos(handleShake, true);

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

  // Fetch standalone weather immediately on GPS (don't wait for destination).
  // Also reverse-geocode the current position to a readable address.
  React.useEffect(() => {
    if (!currentLocation) return;
    // Skip if risk already provides weather (destination set).
    if (risk?.weather) return;
    setStandaloneWeatherLoading(true);
    api
      .weather(currentLocation.lat, currentLocation.lng)
      .then((r) => {
        setStandaloneWeather(r.weather);
        setStandaloneWeatherDesc(r.description);
      })
      .catch(() => { /* ignore */ })
      .finally(() => setStandaloneWeatherLoading(false));

    // Reverse geocode for readable address (fire-and-forget, cached server-side).
    api
      .reverseGeocode(currentLocation.lat, currentLocation.lng)
      .then((r) => setCurrentAddress(r.address))
      .catch(() => setCurrentAddress(null));
  }, [currentLocation, risk?.weather]);

  // Fetch air quality + daylight when location changes (or destination set).
  React.useEffect(() => {
    const loc = currentLocation ?? destination;
    if (!loc) return;
    setAirQualityLoading(true);
    setDaylightLoading(true);
    api
      .airQuality(loc.lat, loc.lng)
      .then(setAirQuality)
      .catch(() => setAirQuality(null))
      .finally(() => setAirQualityLoading(false));
    api
      .daylight(loc.lat, loc.lng)
      .then(setDaylight)
      .catch(() => setDaylight(null))
      .finally(() => setDaylightLoading(false));
  }, [currentLocation, destination]);

  // Online status + offline cache write.
  const online = useOnlineStatus();
  React.useEffect(() => {
    writeOfflineCache(risk, risk?.weather ?? standaloneWeather, weatherDesc ?? standaloneWeatherDesc);
  }, [risk, standaloneWeather, weatherDesc, standaloneWeatherDesc]);

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

  const routeGeometry = overrideGeometry ?? risk?.route?.geometry ?? null;

  // Phase 10: Filtered hazards for map + feed.
  const allHazardTypes = React.useMemo(() => Array.from(new Set(hazards.map((h) => h.type))), [hazards]);
  const filteredHazards = React.useMemo(() => {
    const sevAll = activeSeverityFilters.has("all");
    return hazards.filter((h) => {
      if (!sevAll && !activeSeverityFilters.has(h.severity as SeverityFilter)) return false;
      if (activeTypeFilters.size > 0 && !activeTypeFilters.has(h.type)) return false;
      return true;
    });
  }, [hazards, activeTypeFilters, activeSeverityFilters]);

  const toggleTypeFilter = React.useCallback((type: string) => {
    setActiveTypeFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  }, []);
  const toggleSeverityFilter = React.useCallback((sev: SeverityFilter) => {
    setActiveSeverityFilters((prev) => {
      const next = new Set(prev);
      if (sev === "all") return new Set(["all"]);
      next.delete("all");
      if (next.has(sev)) next.delete(sev); else next.add(sev);
      if (next.size === 0) return new Set(["all"]);
      return next;
    });
  }, []);
  const clearFilters = React.useCallback(() => {
    setActiveTypeFilters(new Set());
    setActiveSeverityFilters(new Set(["all"]));
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-[600] border-b border-border/60 bg-background/80 shadow-sm backdrop-blur-lg supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-14 max-w-[1500px] items-center gap-3 px-3 sm:px-5">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 via-sky-500 to-emerald-500 text-white shadow-md ring-1 ring-white/20">
              <Bike className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-background" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-tight">{t("app.name")}</div>
              <div className="hidden text-[10px] text-muted-foreground sm:block">{t("app.tagline")}</div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {rider && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                <Badge variant="secondary" className="gap-1.5 py-1 pl-2.5 pr-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="font-semibold">{rider.displayName}</span>
                  <span className="flex items-center gap-0.5 rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                    ★{rider.reputation}
                  </span>
                </Badge>
              </motion.div>
            )}
            {/* Realtime connection indicator */}
            {rider && currentLocation && (
              <span
                className={`hidden h-2 w-2 rounded-full sm:inline-block ${realtime.connected ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                title={realtime.connected ? "Live — connected to rider network" : "Connecting…"}
                aria-label={realtime.connected ? "Connected" : "Connecting"}
              />
            )}
            <AlertBell />
            <LanguageSwitcher />
            <button
              type="button"
              onClick={() => setShowShortcuts(true)}
              aria-label="Keyboard shortcuts"
              className="hidden h-9 w-9 items-center justify-center rounded-md border bg-background text-foreground transition hover:bg-accent sm:inline-flex"
            >
              <Keyboard className="h-4 w-4" />
            </button>
            <ThemeToggle />
          </div>
        </div>
        {/* Offline banner */}
        {!online && (
          <div className="flex items-center justify-center gap-1.5 bg-amber-500 px-4 py-1 text-xs font-medium text-white">
            <WifiOff className="h-3 w-3" />
            You're offline — showing cached data. Some features may be unavailable.
          </div>
        )}
      </header>

      {/* Main */}
      <main className="mx-auto w-full max-w-[1500px] flex-1 px-3 py-3 sm:px-5 sm:py-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_440px]">
          {/* LEFT: map + search + controls */}
          <section className="flex flex-col gap-3">
            <DestinationSearch onSelect={onDestinationSelect} recent={recentDestinations} />
            <FavoritesBar
              currentDestination={destination}
              onSelect={(f) => {
                setDestination({ lat: f.lat, lng: f.lng, label: f.label });
                setPinLocation(null);
                setFlyTo({ lat: f.lat, lng: f.lng, zoom: 14 });
                api.touchFavorite(f.id).catch(() => {});
              }}
            />

            <div className="relative h-[44vh] min-h-[340px] w-full lg:h-[calc(100vh-220px)] lg:max-h-[780px]">
              <RiderMap
                center={currentLocation}
                currentLocation={currentLocation}
                destination={destination}
                routeGeometry={routeGeometry}
                hazards={filteredHazards}
                safeStops={safeStops}
                presence={realtime.presence.filter((p) => p.riderId !== rider?.id)}
                onMapClick={onMapClick}
                onHazardClick={(id) => {
                  setSelectedHazardId(id);
                  const h = hazards.find((x) => x.id === id);
                  if (h) setFlyTo({ lat: h.lat, lng: h.lng, zoom: 16 });
                }}
                flyTo={flyTo}
              />
              {/* Wind compass overlay (bottom-left of map) */}
              {(risk?.weather ?? standaloneWeather) && (risk?.weather ?? standaloneWeather)?.windSpeedKph != null && (
                <div className="absolute bottom-10 left-2 z-[500]">
                  <WindCompass
                    windSpeedKph={(risk?.weather ?? standaloneWeather)!.windSpeedKph}
                    windGustKph={(risk?.weather ?? standaloneWeather)!.windGustKph}
                    windDirectionDeg={(risk?.weather ?? standaloneWeather)?.windDirectionDeg}
                  />
                </div>
              )}
              {destination && (
                <button
                  type="button"
                  onClick={() => {
                    setDestination(null);
                    setPinLocation(null);
                  }}
                  className="absolute right-2 top-2 z-[600] inline-flex items-center gap-1 rounded-md border bg-background/90 px-2.5 py-1.5 text-xs font-medium shadow-sm backdrop-blur transition hover:bg-accent"
                >
                  <X className="h-3 w-3" /> Clear destination
                </button>
              )}
            </div>

            <GpsControls
              tracking={tracking}
              currentLocation={currentLocation}
              permission={permission}
              address={currentAddress}
              onStart={startTracking}
              onStop={stopTracking}
              onLocate={locateOnce}
            />

            <AnimatePresence>
              {risk?.route && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Card className="overflow-hidden p-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 font-medium">
                        <RouteIcon className="h-4 w-4 text-sky-600" /> Route summary
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setShowRideMode(true)}
                          className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-emerald-600 to-sky-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:brightness-110"
                          aria-label="Start ride mode"
                        >
                          <Bike className="h-3 w-3" /> Ride
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowShare(true)}
                          className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-[11px] font-medium transition hover:bg-accent"
                          aria-label="Share trip summary"
                        >
                          <Share2 className="h-3 w-3" /> Share
                        </button>
                        <Badge variant="outline" className="text-[10px] capitalize">{risk.route.source.replace("-", " ")}</Badge>
                      </div>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>📏 {risk.route.distanceKm.toFixed(1)} km</span>
                      {risk.route.durationMin != null && <span>⏱ ~{risk.route.durationMin} min</span>}
                      <span>🛣 {routeGeometry ? `${routeGeometry.length} pts` : "—"}</span>
                      <span className="text-sky-600 dark:text-sky-400">ETD now</span>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Route comparison (alternative routes: fastest / shortest / safest) */}
            <RouteComparison
              origin={currentLocation}
              destination={destination}
              onSelectRoute={(geom) => setOverrideGeometry(geom)}
            />
          </section>

          {/* RIGHT: intelligence panels */}
          <aside className="flex flex-col gap-3 pb-20 lg:pb-0 lg:pb-3">
            <div className="flex items-center justify-between gap-2">
              <RiskDashboard risk={risk} loading={riskLoading} onExplain={explain} explaining={aiLoading} />
            </div>
            {/* Delivery impact + voice alerts row */}
            <div className="flex items-center justify-between gap-2">
              <DeliveryImpactCard impact={risk?.impact ?? null} />
              <VoiceAlertsToggle risk={risk} enabled={voiceEnabled} onToggle={setVoiceEnabled} />
            </div>
            <WeatherCard
              weather={risk?.weather ?? standaloneWeather}
              description={weatherDesc ?? standaloneWeatherDesc}
              loading={riskLoading || standaloneWeatherLoading}
            />
            {/* Phase 9: Air quality + daylight + UV */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <AirQualityCard aq={airQuality} loading={airQualityLoading} />
              <DaylightCard daylight={daylight} loading={daylightLoading} />
              <UvIndexCard weather={risk?.weather ?? standaloneWeather} loading={riskLoading || standaloneWeatherLoading} />
            </div>
            {/* Forecast — best departure time, only relevant once we have a location */}
            <ForecastPanel location={currentLocation ?? destination} active={!!(currentLocation ?? destination)} />
            <AiExplanationPanel
              explanation={aiExplanation}
              loading={aiLoading}
              levelLabel={risk ? RISK_META[risk.level].label : undefined}
            />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid h-10 w-full grid-cols-7 gap-0.5 rounded-lg bg-muted/50 p-1">
                <TabsTrigger value="feed" className="gap-0.5 text-[11px]"><Radio className="h-3.5 w-3.5" />{t("tab.feed")}</TabsTrigger>
                <TabsTrigger value="stops" className="gap-0.5 text-[11px]"><StopsIcon className="h-3.5 w-3.5" />{t("tab.stops")}</TabsTrigger>
                <TabsTrigger value="report" className="gap-0.5 text-[11px]"><Siren className="h-3.5 w-3.5" />{t("tab.report")}</TabsTrigger>
                <TabsTrigger value="stats" className="gap-0.5 text-[11px]"><BarChart3 className="h-3.5 w-3.5" />{t("tab.stats")}</TabsTrigger>
                <TabsTrigger value="history" className="gap-0.5 text-[11px]"><History className="h-3.5 w-3.5" />{t("tab.trips")}</TabsTrigger>
                <TabsTrigger value="board" className="gap-0.5 text-[11px]"><Trophy className="h-3.5 w-3.5" />{t("tab.top")}</TabsTrigger>
                <TabsTrigger value="badges" className="gap-0.5 text-[11px]"><Award className="h-3.5 w-3.5" />{t("tab.badges")}</TabsTrigger>
              </TabsList>
              <TabsContent value="feed" className="mt-3">
                <div className="mb-2 flex items-center justify-between">
                  <Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={() => setShowSettings(true)}>
                    <SettingsIcon className="h-3 w-3" /> {t("common.settings")}
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={refreshFeed}>
                    <RefreshCw className="h-3 w-3" /> {t("common.refresh")}
                  </Button>
                </div>
                {hazards.length > 0 && (
                  <div className="mb-2">
                    <HazardFilter
                      hazardTypes={allHazardTypes}
                      activeTypes={activeTypeFilters}
                      activeSeverities={activeSeverityFilters}
                      onToggleType={toggleTypeFilter}
                      onToggleSeverity={toggleSeverityFilter}
                      onClear={clearFilters}
                      resultCount={filteredHazards.length}
                      totalCount={hazards.length}
                    />
                  </div>
                )}
                <CommunityFeed
                  feed={feed.filter((item) => {
                    if (item.kind !== "hazard") return true;
                    if (!item.id) return true;
                    const h = hazards.find((x) => x.id === item.id);
                    if (!h) return true;
                    return filteredHazards.includes(h);
                  })}
                  loading={feedLoading}
                  center={currentLocation}
                  onVoteChange={refreshFeed}
                  onFocus={(lat, lng) => setFlyTo({ lat, lng, zoom: 16 })}
                  onHazardClick={(id) => setSelectedHazardId(id)}
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
                  onCreated={() => {
                    refreshFeed();
                    const loc = pinLocation ?? currentLocation;
                    if (loc) realtime.emitHazardNew({ lat: loc.lat, lng: loc.lng, type: "other", severity: "moderate" });
                  }}
                />
              </TabsContent>
              <TabsContent value="stats" className="mt-3">
                <StatsDashboard />
              </TabsContent>
              <TabsContent value="history" className="mt-3">
                <HistoryPanel />
              </TabsContent>
              <TabsContent value="board" className="mt-3">
                <LeaderboardPanel riderId={rider?.id ?? null} />
              </TabsContent>
              <TabsContent value="badges" className="mt-3">
                <AchievementsPanel />
              </TabsContent>
            </Tabs>
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-border/60 bg-muted/30">
        <div className="mx-auto flex max-w-[1500px] flex-col items-center justify-between gap-2 px-4 py-3 text-xs text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-sky-500" />
            <span>{t("footer.deterministic")}</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <span>{t("footer.weather")}</span>
            <span>· {t("footer.maps")}</span>
            <span>· {t("footer.routing")}</span>
            <span>· {t("footer.ai")}</span>
            <span>· {t("footer.realtime")}</span>
          </div>
        </div>
      </footer>

      {/* Floating SOS button — always accessible */}
      <SosButton
        location={currentLocation}
        onSosTrigger={(loc) => realtime.emitSosTrigger(loc)}
        onSosCancel={() => realtime.emitSosResolve()}
      />

      {/* First-time rider onboarding */}
      <OnboardingModal
        isNew={!!rider?.isNew && !onboardingDismissed}
        onClose={() => setOnboardingDismissed(true)}
      />

      {/* Real-time push toasts */}
      <RealtimeToasts
        realtime={realtime}
        onHazardPush={() => {
          if (realtime.hazardPush) setFlyTo({ lat: realtime.hazardPush.lat, lng: realtime.hazardPush.lng, zoom: 16 });
          realtime.clearHazardPush();
        }}
        onSosAlert={() => {
          if (realtime.sosAlert) setFlyTo({ lat: realtime.sosAlert.lat, lng: realtime.sosAlert.lng, zoom: 17 });
          realtime.clearSosAlert();
        }}
        onVoteUpdate={refreshFeed}
      />

      {/* Hazard detail modal */}
      <HazardDetailModal
        hazardId={selectedHazardId}
        onClose={() => setSelectedHazardId(null)}
        onVoteChange={refreshFeed}
        onFocus={(lat, lng) => setFlyTo({ lat, lng, zoom: 17 })}
      />

      {/* Settings panel (modal) */}
      {showSettings && (
        <div
          className="fixed inset-0 z-[850] flex items-end justify-center bg-black/50 p-3 backdrop-blur-sm sm:items-center"
          onClick={() => setShowSettings(false)}
        >
          <div className="max-h-[88vh] w-full max-w-md overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <SettingsPanel
              onClose={() => setShowSettings(false)}
              onAccountDeleted={() => {
                // reload to get a new anonymous rider
                window.location.reload();
              }}
            />
          </div>
        </div>
      )}

      {/* Keyboard shortcuts overlay */}
      <KeyboardShortcutsOverlay open={showShortcuts} onClose={() => setShowShortcuts(false)} />

      {/* Share trip summary modal */}
      <ShareTripSummary
        risk={risk}
        destinationLabel={destination?.label}
        open={showShare}
        onClose={() => setShowShare(false)}
      />

      {/* Active Ride Mode — fullscreen simplified UI for riding */}
      <RideMode
        open={showRideMode}
        onClose={() => setShowRideMode(false)}
        risk={risk}
        destination={destination}
        voiceEnabled={voiceEnabled}
        onToggleVoice={setVoiceEnabled}
        tripElapsedSec={tripElapsed}
        aiExplanation={aiExplanation}
      />

      {/* Quick-report FAB (bottom-left, for active riding) */}
      <QuickReportFab location={currentLocation} onCreated={refreshFeed} />

      {/* Mobile bottom navigation (hidden on desktop) */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
