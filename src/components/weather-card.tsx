"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CloudSun, Droplets, Wind, Eye, Thermometer } from "lucide-react";
import type { WeatherInfo } from "@/lib/types";
import { describeWeatherCodeClient } from "@/lib/weather-codes-client";

interface Props {
  weather: WeatherInfo | null;
  description?: string;
  loading: boolean;
}

export default function WeatherCard({ weather, description, loading }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CloudSun className="h-4 w-4" /> Live Weather
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && !weather ? (
          <div className="py-4 text-sm text-muted-foreground">Fetching conditions…</div>
        ) : !weather ? (
          <div className="py-4 text-sm text-muted-foreground">Weather unavailable for this location.</div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold tabular-nums">{Math.round(weather.tempC)}°C</div>
                <div className="text-xs text-muted-foreground">feels like {Math.round(weather.apparentTempC)}°C</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{description ?? describeWeatherCodeClient(weather)}</div>
                <div className="text-xs text-muted-foreground">{weather.isDay ? "Daytime" : "Night"} · ☁ {weather.cloudCover}%</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Metric icon={<Droplets className="h-3.5 w-3.5" />} label="Rain" value={`${weather.precipMm.toFixed(1)} mm`} sub={`${Math.round(weather.precipProbability * 100)}% prob`} warn={weather.precipMm >= 1} />
              <Metric icon={<Wind className="h-3.5 w-3.5" />} label="Wind" value={`${Math.round(weather.windSpeedKph)} km/h`} sub={`gust ${Math.round(weather.windGustKph)}`} warn={weather.windGustKph >= 35} />
              <Metric icon={<Eye className="h-3.5 w-3.5" />} label="Visibility" value={`${(weather.visibilityM / 1000).toFixed(1)} km`} sub={weather.visibilityM < 1000 ? "poor" : weather.visibilityM < 2500 ? "reduced" : "good"} warn={weather.visibilityM < 2500} />
              <Metric icon={<Thermometer className="h-3.5 w-3.5" />} label="Humidity" value={`${weather.humidity}%`} sub={weather.humidity > 80 ? "humid" : "ok"} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ icon, label, value, sub, warn }: { icon: React.ReactNode; label: string; value: string; sub: string; warn?: boolean }) {
  return (
    <div className={`rounded-md border p-2 ${warn ? "border-orange-400/60 bg-orange-50 dark:bg-orange-950/30" : ""}`}>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="font-semibold tabular-nums">{value}</div>
      <div className={`text-[10px] ${warn ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"}`}>{sub}</div>
    </div>
  );
}
