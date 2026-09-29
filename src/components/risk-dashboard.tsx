"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RISK_META } from "@/lib/api-client";
import type { RiskAssessmentData } from "@/lib/types";
import RiskGauge from "@/components/risk-gauge";
import { ShieldAlert, Activity, Gauge as GaugeIcon, Sparkles, Loader2, Route as RouteIcon, AlertTriangle, CloudRain } from "lucide-react";

interface Props {
  risk: RiskAssessmentData | null;
  loading: boolean;
  onExplain: () => void;
  explaining: boolean;
}

function Skeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldAlert className="h-4 w-4" /> Trip Risk Assessment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center py-2">
          <div className="h-[100px] w-[180px] animate-pulse rounded-full bg-muted" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
              <div className="h-1.5 w-full animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function RiskDashboard({ risk, loading, onExplain, explaining }: Props) {
  if (loading && !risk) return <Skeleton />;

  if (!risk) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4" /> Trip Risk Assessment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 py-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <ShieldAlert className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Set your location and a destination to compute a deterministic risk score.</p>
          <p className="text-xs text-muted-foreground/70">The risk engine is the single source of truth — AI only explains it.</p>
        </CardContent>
      </Card>
    );
  }

  const meta = RISK_META[risk.level];

  return (
    <Card className="overflow-hidden border-l-4" style={{ borderLeftColor: levelHex(risk.level) }}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" /> Trip Risk Assessment
          </span>
          <Badge variant="outline" className={`${meta.color} gap-1`}>
            <span className="text-xs">{meta.emoji}</span> {meta.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Gauge + quick stats */}
        <div className="flex items-center gap-4">
          <RiskGauge score={risk.score} level={risk.level} />
          <div className="flex-1 space-y-2">
            <QuickStat icon={<Activity className="h-3.5 w-3.5" />} label="Hazards" value={`${risk.hazards.activeCount}`} sub={`${risk.hazards.severeCount} severe`} warn={risk.hazards.severeCount > 0} />
            <QuickStat icon={<RouteIcon className="h-3.5 w-3.5" />} label="Distance" value={risk.route ? `${risk.route.distanceKm.toFixed(1)} km` : "—"} sub={risk.route?.durationMin ? `~${risk.route.durationMin} min` : ""} />
            <QuickStat icon={<CloudRain className="h-3.5 w-3.5" />} label="Rain chance" value={risk.weather ? `${Math.round(risk.weather.precipProbability * 100)}%` : "—"} sub={risk.weather ? `${risk.weather.precipMm.toFixed(1)}mm now` : ""} warn={risk.weather ? risk.weather.precipProbability > 0.5 : false} />
          </div>
        </div>

        <Separator />

        {/* Contributing factors */}
        <div className="space-y-2.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contributing factors</div>
          {risk.factors.map((f, i) => (
            <motion.div
              key={f.factor}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              className="space-y-1"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{f.factor}</span>
                <span className="tabular-nums text-muted-foreground">+{f.weight}</span>
              </div>
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  className={`absolute inset-y-0 left-0 rounded-full ${f.weight > 10 ? "bg-orange-500" : f.weight > 5 ? "bg-amber-500" : "bg-emerald-500"}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, f.weight * 2.5)}%` }}
                  transition={{ duration: 0.6, delay: 0.2 + i * 0.08 }}
                />
              </div>
              <div className="text-xs text-muted-foreground">{f.detail}</div>
            </motion.div>
          ))}
        </div>

        {/* Recommendation */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-lg border bg-gradient-to-br from-muted/40 to-muted/10 p-3 text-sm"
        >
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <AlertTriangle className="h-3 w-3" /> Recommendation
          </div>
          <p className="leading-relaxed">{risk.recommendation}</p>
        </motion.div>

        <button
          type="button"
          onClick={onExplain}
          disabled={explaining}
          className="group inline-flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-sky-600 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-md hover:brightness-110 disabled:opacity-60"
        >
          {explaining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 transition group-hover:scale-110" />}
          {explaining ? "Asking AI co-pilot…" : "Ask AI co-pilot to explain"}
        </button>
      </CardContent>
    </Card>
  );
}

function QuickStat({ icon, label, value, sub, warn }: { icon: React.ReactNode; label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg border p-2 ${warn ? "border-orange-400/60 bg-orange-50 dark:bg-orange-950/20" : "bg-muted/30"}`}>
      <div className={`flex h-7 w-7 items-center justify-center rounded-md ${warn ? "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300" : "bg-muted text-muted-foreground"}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-bold tabular-nums">{value}</span>
          {sub && <span className="truncate text-[10px] text-muted-foreground">{sub}</span>}
        </div>
      </div>
    </div>
  );
}

function levelHex(level: string): string {
  switch (level) {
    case "low": return "#10b981";
    case "moderate": return "#f59e0b";
    case "high": return "#f97316";
    case "severe": return "#ef4444";
    default: return "#e5e7eb";
  }
}
