"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, TrendingUp, Loader2, MapPin } from "lucide-react";
import { api, RISK_META } from "@/lib/api-client";
import type { HistoryRecord, HistoryStats } from "@/lib/types";
import { toast } from "sonner";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function levelColor(level: string): string {
  switch (level) {
    case "low": return "#10b981";
    case "moderate": return "#f59e0b";
    case "high": return "#f97316";
    case "severe": return "#ef4444";
    default: return "#94a3b8";
  }
}

export default function HistoryPanel() {
  const [history, setHistory] = React.useState<HistoryRecord[]>([]);
  const [stats, setStats] = React.useState<HistoryStats | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(() => {
    setLoading(true);
    api
      .history(15)
      .then((r) => {
        setHistory(r.history);
        setStats(r.stats);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load history"))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" /> Trip History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your past trips…
          </div>
        ) : history.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No trips yet. Your risk assessments will appear here.
          </div>
        ) : (
          <>
            {/* Stats summary */}
            {stats && (
              <div className="grid grid-cols-4 gap-2">
                <StatTile label="Trips" value={String(stats.totalTrips)} />
                <StatTile label="Avg" value={String(stats.avgScore)} color={levelColor(avgLevel(stats.avgScore))} />
                <StatTile label="Worst" value={String(stats.worstScore)} color={levelColor(worstLevel(stats.worstScore))} />
                <StatTile label="Best" value={String(stats.bestScore)} color={levelColor(bestLevel(stats.bestScore))} />
              </div>
            )}

            {/* History list */}
            <ScrollArea className="max-h-72">
              <div className="space-y-1.5 pr-2">
                {history.map((h, i) => {
                  const meta = RISK_META[h.level];
                  return (
                    <motion.div
                      key={h.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-3 rounded-lg border bg-card/50 p-2.5"
                    >
                      <div
                        className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg text-white"
                        style={{ backgroundColor: levelColor(h.level) }}
                      >
                        <span className="text-base font-bold leading-none tabular-nums">{h.score}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className={`text-[10px] ${meta.color}`}>{h.level}</Badge>
                          <span className="text-xs text-muted-foreground">{timeAgo(h.createdAt)}</span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {h.weatherSummary ?? "weather n/a"}
                        </div>
                      </div>
                      <div className="flex flex-wrap justify-end gap-1">
                        {h.factors.slice(0, 2).map((f) => (
                          <span key={f.factor} className="rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                            {f.factor.split(" ")[0]} +{f.weight}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StatTile({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-2 text-center">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-lg font-bold tabular-nums" style={color ? { color } : undefined}>{value}</div>
    </div>
  );
}

function avgLevel(score: number): string {
  return score >= 70 ? "severe" : score >= 45 ? "high" : score >= 25 ? "moderate" : "low";
}
function worstLevel(score: number): string {
  return avgLevel(score);
}
function bestLevel(score: number): string {
  return avgLevel(score);
}
