"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sunrise, Sunset, Loader2, Sun, Clock } from "lucide-react";
import type { DaylightInfo } from "@/lib/types";
import { phaseEmoji, phaseColor } from "@/lib/daylight-service";

interface Props {
  daylight: DaylightInfo | null;
  loading: boolean;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function fmtCountdown(min: number | null, event: string): string {
  if (min === null) return "";
  if (min < 60) return `${min}m until ${event}`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m until ${event}`;
}

export default function DaylightCard({ daylight, loading }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sun className="h-4 w-4 text-amber-500" /> Daylight
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && !daylight ? (
          <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading daylight…
          </div>
        ) : !daylight ? (
          <div className="py-3 text-center text-sm text-muted-foreground">Daylight data unavailable.</div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2.5">
            {/* Current phase */}
            <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xl">{phaseEmoji(daylight.phase)}</span>
                <div>
                  <div className="text-sm font-semibold capitalize">{daylight.phase}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {daylight.isDay ? "Daylight" : "Night"} · {Math.round(daylight.daylightMinutes / 60)}h daylight today
                  </div>
                </div>
              </div>
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: phaseColor(daylight.phase) }}
                title={daylight.phase}
              />
            </div>

            {/* Sunrise / Sunset */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border p-2.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Sunrise className="h-3.5 w-3.5 text-amber-500" /> Sunrise
                </div>
                <div className="mt-0.5 text-sm font-bold tabular-nums">{fmtTime(daylight.sunrise)}</div>
              </div>
              <div className="rounded-lg border p-2.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Sunset className="h-3.5 w-3.5 text-orange-500" /> Sunset
                </div>
                <div className="mt-0.5 text-sm font-bold tabular-nums">{fmtTime(daylight.sunset)}</div>
              </div>
            </div>

            {/* Countdown */}
            {(daylight.minutesUntilSunset !== null || daylight.minutesUntilSunrise !== null) && (
              <div className="flex items-center gap-1.5 rounded-lg border border-sky-400/30 bg-sky-50 p-2 text-xs text-sky-700 dark:bg-sky-950/20 dark:text-sky-300">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {daylight.minutesUntilSunset !== null
                    ? fmtCountdown(daylight.minutesUntilSunset, "sunset")
                    : fmtCountdown(daylight.minutesUntilSunrise, "sunrise")}
                </span>
              </div>
            )}

            {/* Phase-specific advisory */}
            {(daylight.phase === "dawn" || daylight.phase === "dusk") && (
              <div className="flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-50 p-2 text-xs text-amber-700 dark:bg-amber-950/20 dark:text-amber-300">
                <Sun className="h-3.5 w-3.5 shrink-0" />
                <span>Glare risk: sun is low on the horizon. Use anti-glare visor and ride cautiously.</span>
              </div>
            )}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
