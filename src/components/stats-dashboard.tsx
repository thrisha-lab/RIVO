"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Loader2, Route as RouteIcon, Siren, ThumbsUp, Flame, Calendar } from "lucide-react";
import { api } from "@/lib/api-client";
import type { RiderStats } from "@/lib/types";
import { toast } from "sonner";

function levelColor(level: string): string {
  switch (level) {
    case "low": return "#10b981";
    case "moderate": return "#f59e0b";
    case "high": return "#f97316";
    case "severe": return "#ef4444";
    default: return "#94a3b8";
  }
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2);
}

export default function StatsDashboard() {
  const [stats, setStats] = React.useState<RiderStats | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    api
      .getStats()
      .then(setStats)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load stats"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4" /> Weekly Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Crunching your numbers…
          </div>
        ) : !stats ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Stats unavailable.</div>
        ) : (
          <>
            {/* Stat tiles */}
            <div className="grid grid-cols-4 gap-2">
              <StatTile icon={<RouteIcon className="h-3.5 w-3.5" />} label="Trips" value={String(stats.weekly.trips)} color="text-sky-600" />
              <StatTile icon={<RouteIcon className="h-3.5 w-3.5" />} label="Distance" value={`${stats.weekly.distanceKm}km`} color="text-emerald-600" />
              <StatTile icon={<Siren className="h-3.5 w-3.5" />} label="Reports" value={String(stats.weekly.reports)} color="text-orange-600" />
              <StatTile icon={<ThumbsUp className="h-3.5 w-3.5" />} label="Votes" value={String(stats.weekly.votes)} color="text-violet-600" />
            </div>

            {/* Streak + active days */}
            <div className="flex items-center justify-between rounded-lg border bg-gradient-to-br from-orange-50 to-amber-50 p-3 dark:from-orange-950/20 dark:to-amber-950/20">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <Flame className="h-5 w-5 text-orange-500" />
                </motion.div>
                <div>
                  <div className="text-xs text-muted-foreground">Current streak</div>
                  <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{stats.streak} day{stats.streak !== 1 ? "s" : ""}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {stats.activeDays} active day{stats.activeDays !== 1 ? "s" : ""} (14d)
              </div>
            </div>

            {/* Daily trips bar chart */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trips this week</span>
                <span className="text-xs text-muted-foreground">avg risk {stats.weekly.avgScore}/100</span>
              </div>
              <div className="flex h-24 items-end gap-1.5 rounded-lg border bg-muted/20 p-2">
                {stats.daily.map((d, i) => {
                  const maxTrips = Math.max(1, ...stats.daily.map((x) => x.trips));
                  const h = d.trips === 0 ? 4 : (d.trips / maxTrips) * 100;
                  const c = d.avgScore > 0 ? levelColor(d.avgScore >= 70 ? "severe" : d.avgScore >= 45 ? "high" : d.avgScore >= 25 ? "moderate" : "low") : "#cbd5e1";
                  return (
                    <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ delay: i * 0.05, duration: 0.4 }}
                        className="w-full rounded-t-sm"
                        style={{ height: `${h}%`, backgroundColor: c, opacity: d.trips === 0 ? 0.3 : 0.85, minHeight: 4 }}
                        title={`${dayLabel(d.date)}: ${d.trips} trip(s), avg ${d.avgScore}`}
                      />
                      <span className="text-[9px] text-muted-foreground">{dayLabel(d.date)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Risk level distribution */}
            {stats.weekly.trips > 0 && (
              <div>
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Risk distribution</div>
                <div className="flex h-3 overflow-hidden rounded-full border">
                  {["low", "moderate", "high", "severe"].map((lvl) => {
                    const count = stats.weekly.levelCounts[lvl] ?? 0;
                    const pct = (count / stats.weekly.trips) * 100;
                    if (pct === 0) return null;
                    return (
                      <div
                        key={lvl}
                        className="h-full"
                        style={{ width: `${pct}%`, backgroundColor: levelColor(lvl) }}
                        title={`${lvl}: ${count} (${Math.round(pct)}%)`}
                      />
                    );
                  })}
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                  {["low", "moderate", "high", "severe"].map((lvl) => {
                    const count = stats.weekly.levelCounts[lvl] ?? 0;
                    if (count === 0) return null;
                    return (
                      <span key={lvl} className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: levelColor(lvl) }} />
                        {lvl} {count}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* All-time summary */}
            <div className="grid grid-cols-3 gap-2 border-t pt-3 text-center">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">All trips</div>
                <div className="text-lg font-bold tabular-nums">{stats.allTime.trips}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">All reports</div>
                <div className="text-lg font-bold tabular-nums">{stats.allTime.reports}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Reputation</div>
                <div className="text-lg font-bold tabular-nums text-amber-600">★ {stats.allTime.votes}</div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StatTile({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-2 text-center">
      <div className={`mx-auto mb-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-muted ${color}`}>
        {icon}
      </div>
      <div className="text-sm font-bold tabular-nums">{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
