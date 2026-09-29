"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Sun, Moon, CloudRain, Wind, TrendingDown, TrendingUp, Loader2, CalendarClock } from "lucide-react";
import { api, RISK_META } from "@/lib/api-client";
import type { ForecastData, DepartureWindow } from "@/lib/types";
import { toast } from "sonner";

interface Props {
  location: { lat: number; lng: number } | null;
  active: boolean;
}

function riskColor(score: number): string {
  if (score >= 70) return "#ef4444";
  if (score >= 45) return "#f97316";
  if (score >= 25) return "#f59e0b";
  return "#10b981";
}

export default function ForecastPanel({ location, active }: Props) {
  const [data, setData] = React.useState<ForecastData | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!location || !active) return;
    setLoading(true);
    api
      .forecast(location.lat, location.lng, 12)
      .then(setData)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Forecast failed"))
      .finally(() => setLoading(false));
  }, [location, active]);

  if (!active) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2"><CalendarClock className="h-4 w-4" /> 12-Hour Forecast</span>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && !data ? (
          <div className="space-y-2">
            <div className="h-24 w-full animate-pulse rounded-lg bg-muted" />
            <div className="h-16 w-full animate-pulse rounded-lg bg-muted" />
          </div>
        ) : !data || data.forecast.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">Forecast unavailable for this location.</div>
        ) : (
          <>
            {/* Best departure recommendation */}
            {data.recommendation.best && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-emerald-400/40 bg-gradient-to-br from-emerald-50 to-emerald-50/30 p-3 dark:from-emerald-950/30 dark:to-transparent"
              >
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  <TrendingDown className="h-3.5 w-3.5" /> Best time to depart
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{data.recommendation.best.label}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">risk {data.recommendation.best.riskScore}/100</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{data.recommendation.best.summary}</p>
                {data.recommendation.worst && data.recommendation.worst.riskScore - data.recommendation.best.riskScore > 15 && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                    <TrendingUp className="h-3 w-3" /> Avoid {data.recommendation.worst.label} (risk {data.recommendation.worst.riskScore})
                  </p>
                )}
              </motion.div>
            )}

            {/* Hourly risk bar chart */}
            <div>
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Risk by hour</div>
              <div className="flex h-28 items-end gap-1 rounded-lg border bg-muted/20 p-2">
                {data.forecast.map((h, i) => {
                  const c = riskColor(h.riskScore);
                  return (
                    <motion.div
                      key={h.time}
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(4, h.riskScore)}%` }}
                      transition={{ delay: i * 0.04, duration: 0.4 }}
                      className="group relative flex flex-1 flex-col items-center justify-end"
                      title={`${formatHour(h.time)}: risk ${h.riskScore}, ${h.tempC.toFixed(0)}°C, ${h.precipMm.toFixed(1)}mm rain`}
                    >
                      <div className="w-full rounded-t-sm transition group-hover:opacity-80" style={{ height: "100%", backgroundColor: c, opacity: 0.85 }} />
                      <div className="absolute -top-5 hidden whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[9px] text-background group-hover:block">
                        {h.riskScore}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              <div className="mt-1 flex justify-between px-1 text-[9px] text-muted-foreground">
                {data.forecast.filter((_, i) => i % 2 === 0).map((h) => (
                  <span key={h.time}>{formatHour(h.time)}</span>
                ))}
              </div>
            </div>

            {/* Hourly detail scroller */}
            <ScrollArea className="max-h-44">
              <div className="space-y-1.5 pr-2">
                {data.forecast.map((h) => (
                  <div key={h.time} className="flex items-center gap-2 rounded-md border bg-card/50 p-2 text-xs">
                    <div className="flex w-14 flex-col">
                      <span className="font-semibold">{formatHour(h.time)}</span>
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        {h.isDay ? <Sun className="h-2.5 w-2.5" /> : <Moon className="h-2.5 w-2.5" />}
                        {h.hour}
                      </span>
                    </div>
                    <div className="flex flex-1 items-center gap-3">
                      <span className="w-10 font-semibold tabular-nums">{h.tempC.toFixed(0)}°C</span>
                      <span className="flex items-center gap-0.5 text-muted-foreground" title="precipitation">
                        <CloudRain className="h-3 w-3" />{h.precipMm.toFixed(1)}mm
                      </span>
                      <span className="flex items-center gap-0.5 text-muted-foreground" title="wind gust">
                        <Wind className="h-3 w-3" />{Math.round(h.windGustKph)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-10 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full" style={{ width: `${h.riskScore}%`, backgroundColor: riskColor(h.riskScore) }} />
                      </div>
                      <span className="w-6 text-right font-semibold tabular-nums" style={{ color: riskColor(h.riskScore) }}>{h.riskScore}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function formatHour(iso: string): string {
  const d = new Date(iso);
  const hh = d.getHours();
  const ampm = hh >= 12 ? "p" : "a";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}${ampm}`;
}
