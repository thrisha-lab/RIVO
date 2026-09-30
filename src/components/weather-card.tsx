"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CloudSun, Droplets, Wind, Eye, Thermometer, CloudOff, MapPin } from "lucide-react";
import type { WeatherInfo } from "@/lib/types";
import { describeWeatherCodeClient } from "@/lib/weather-codes-client";

interface Props {
  weather: WeatherInfo | null;
  description?: string;
  loading: boolean;
}

function WeatherSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-7 w-20 animate-pulse rounded bg-muted" />
          <div className="h-3 w-16 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-8 w-24 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-md border bg-muted" />
        ))}
      </div>
    </div>
  );
}

/** Subtle animated weather glyph reflecting current conditions. */
function WeatherGlyph({ weather }: { weather: WeatherInfo }) {
  const raining = weather.precipMm >= 1;
  const heavy = weather.precipMm >= 4;
  const windy = weather.windGustKph >= 35;
  const foggy = weather.visibilityM < 1500;
  const cloudy = weather.cloudCover >= 60;
  const night = !weather.isDay;

  if (foggy) return <span className="text-3xl">🌫️</span>;
  if (raining && heavy) return <motion.span animate={{ y: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 1.2 }} className="text-3xl">⛈️</motion.span>;
  if (raining) return <motion.span animate={{ y: [0, 2, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="text-3xl">🌧️</motion.span>;
  if (windy) return <motion.span animate={{ rotate: [-5, 5, -5] }} transition={{ repeat: Infinity, duration: 2 }} className="text-3xl">💨</motion.span>;
  if (cloudy && night) return <span className="text-3xl">☁️🌙</span>;
  if (cloudy) return <span className="text-3xl">☁️</span>;
  if (night) return <span className="text-3xl">🌙</span>;
  return <motion.span animate={{ rotate: [0, 15, 0] }} transition={{ repeat: Infinity, duration: 4 }} className="text-3xl">☀️</motion.span>;
}

export default function WeatherCard({ weather, description, loading }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CloudSun className="h-4 w-4 text-sky-500" /> Live Weather
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && !weather ? (
          <WeatherSkeleton />
        ) : !weather ? (
          <div className="flex flex-col items-center gap-2 py-5 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 dark:bg-sky-950/30">
              <CloudSun className="h-6 w-6 text-sky-400" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Weather loads when you set a destination</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground/70">
              <MapPin className="h-3 w-3" /> Tap "Find me" or pick a destination on the map
            </p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <WeatherGlyph weather={weather} />
                <div>
                  <div className="text-3xl font-bold tabular-nums leading-none">{Math.round(weather.tempC)}°<span className="text-lg">C</span></div>
                  <div className="mt-0.5 text-xs text-muted-foreground">feels {Math.round(weather.apparentTempC)}°C</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{description ?? describeWeatherCodeClient(weather)}</div>
                <div className="text-xs text-muted-foreground">{weather.isDay ? "Daytime" : "Night"} · ☁ {weather.cloudCover}%</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Metric
                icon={<Droplets className="h-3.5 w-3.5" />}
                label="Rain now"
                value={`${weather.precipMm.toFixed(1)} mm`}
                sub={weather.precipMm > 0 ? "falling" : `${Math.round(weather.precipProbability * 100)}% chance`}
                warn={weather.precipMm >= 1}
              />
              <Metric icon={<Wind className="h-3.5 w-3.5" />} label="Wind" value={`${Math.round(weather.windSpeedKph)} km/h`} sub={`gust ${Math.round(weather.windGustKph)}`} warn={weather.windGustKph >= 35} />
              <Metric icon={<Eye className="h-3.5 w-3.5" />} label="Visibility" value={`${(weather.visibilityM / 1000).toFixed(1)} km`} sub={weather.visibilityM < 1000 ? "poor" : weather.visibilityM < 2500 ? "reduced" : "good"} warn={weather.visibilityM < 2500} />
              <Metric icon={<Thermometer className="h-3.5 w-3.5" />} label="Humidity" value={`${weather.humidity}%`} sub={weather.humidity > 80 ? "humid" : "ok"} />
            </div>
            {weather.precipProbability > 0.5 && weather.precipMm === 0 && (
              <div className="flex items-center gap-1.5 rounded-md border border-sky-400/40 bg-sky-50 p-2 text-xs text-sky-700 dark:bg-sky-950/30 dark:text-sky-300">
                <Droplets className="h-3.5 w-3.5 shrink-0" />
                <span>Rain isn't falling yet, but there's a <strong>{Math.round(weather.precipProbability * 100)}% chance</strong> in the next few hours. Carry wet-weather gear.</span>
              </div>
            )}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ icon, label, value, sub, warn }: { icon: React.ReactNode; label: string; value: string; sub: string; warn?: boolean }) {
  return (
    <div className={`rounded-lg border p-2 transition ${warn ? "border-orange-400/60 bg-orange-50 dark:bg-orange-950/20" : "bg-muted/20"}`}>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="font-semibold tabular-nums">{value}</div>
      <div className={`text-[10px] ${warn ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"}`}>{sub}</div>
    </div>
  );
}
