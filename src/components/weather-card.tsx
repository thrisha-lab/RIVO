"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CloudSun, Droplets, Wind, Eye, Thermometer, CloudOff } from "lucide-react";
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
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <CloudOff className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Weather loads once you set a destination.</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold tabular-nums leading-none">{Math.round(weather.tempC)}°<span className="text-lg">C</span></div>
                <div className="mt-0.5 text-xs text-muted-foreground">feels like {Math.round(weather.apparentTempC)}°C</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{description ?? describeWeatherCodeClient(weather)}</div>
                <div className="text-xs text-muted-foreground">{weather.isDay ? "☀️ Daytime" : "🌙 Night"} · ☁ {weather.cloudCover}%</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Metric icon={<Droplets className="h-3.5 w-3.5" />} label="Rain" value={`${weather.precipMm.toFixed(1)} mm`} sub={`${Math.round(weather.precipProbability * 100)}% prob`} warn={weather.precipMm >= 1} />
              <Metric icon={<Wind className="h-3.5 w-3.5" />} label="Wind" value={`${Math.round(weather.windSpeedKph)} km/h`} sub={`gust ${Math.round(weather.windGustKph)}`} warn={weather.windGustKph >= 35} />
              <Metric icon={<Eye className="h-3.5 w-3.5" />} label="Visibility" value={`${(weather.visibilityM / 1000).toFixed(1)} km`} sub={weather.visibilityM < 1000 ? "poor" : weather.visibilityM < 2500 ? "reduced" : "good"} warn={weather.visibilityM < 2500} />
              <Metric icon={<Thermometer className="h-3.5 w-3.5" />} label="Humidity" value={`${weather.humidity}%`} sub={weather.humidity > 80 ? "humid" : "ok"} />
            </div>
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
