"use client";

import * as React from "react";
import type { RiskAssessmentData, WeatherInfo } from "@/lib/types";

const RISK_KEY = "rg-last-risk";
const WEATHER_KEY = "rg-last-weather";
const TIMESTAMP_KEY = "rg-last-cache-ts";

interface CachedData {
  risk: RiskAssessmentData | null;
  weather: WeatherInfo | null;
  weatherDesc?: string;
  timestamp: number;
}

/** Read the cached risk/weather from localStorage (for offline display). */
export function readOfflineCache(): CachedData | null {
  if (typeof window === "undefined") return null;
  try {
    const risk = window.localStorage.getItem(RISK_KEY);
    const weather = window.localStorage.getItem(WEATHER_KEY);
    const ts = window.localStorage.getItem(TIMESTAMP_KEY);
    if (!ts) return null;
    return {
      risk: risk ? JSON.parse(risk) : null,
      weather: weather ? JSON.parse(weather) : null,
      timestamp: parseInt(ts, 10),
    };
  } catch {
    return null;
  }
}

/** Write the current risk/weather to localStorage. */
export function writeOfflineCache(risk: RiskAssessmentData | null, weather: WeatherInfo | null, weatherDesc?: string): void {
  if (typeof window === "undefined") return;
  try {
    if (risk) {
      window.localStorage.setItem(RISK_KEY, JSON.stringify(risk));
    }
    if (weather) {
      window.localStorage.setItem(WEATHER_KEY, JSON.stringify(weather));
    }
    if (weatherDesc) {
      window.localStorage.setItem("rg-last-weather-desc", weatherDesc);
    }
    window.localStorage.setItem(TIMESTAMP_KEY, String(Date.now()));
  } catch {
    /* localStorage may be full or disabled */
  }
}

/** Check if the browser is currently offline. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = React.useState(true);
  React.useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

/** Format the cache age as a human-readable string. */
export function formatCacheAge(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
