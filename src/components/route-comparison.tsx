"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Route as RouteIcon, Loader2, Zap, Shield, Ruler, Check, ChevronDown, ChevronUp } from "lucide-react";
import { api, RISK_META } from "@/lib/api-client";
import type { RouteOption } from "@/app/api/routes/compare/route";
import { toast } from "sonner";

interface Props {
  origin: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number; label?: string } | null;
  onSelectRoute: (geometry: { lat: number; lng: number }[]) => void;
}

const LABEL_META: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  fastest: { icon: <Zap className="h-3.5 w-3.5" />, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-100 dark:bg-sky-950" },
  shortest: { icon: <Ruler className="h-3.5 w-3.5" />, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-100 dark:bg-violet-950" },
  safest: { icon: <Shield className="h-3.5 w-3.5" />, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-950" },
  alternative: { icon: <RouteIcon className="h-3.5 w-3.5" />, color: "text-muted-foreground", bg: "bg-muted" },
};

export default function RouteComparison({ origin, destination, onSelectRoute }: Props) {
  const [options, setOptions] = React.useState<RouteOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const [selectedIdx, setSelectedIdx] = React.useState<number | null>(null);

  const load = React.useCallback(async () => {
    if (!origin || !destination) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/routes/compare?originLat=${origin.lat}&originLng=${origin.lng}&destLat=${destination.lat}&destLng=${destination.lng}`,
        { credentials: "same-origin" },
      );
      const json = (await res.json()) as { ok: boolean; data?: { options: RouteOption[] }; error?: string };
      if (json.ok && json.data) {
        setOptions(json.data.options);
        // Auto-select the recommended (safest) route.
        const rec = json.data.options.find((o) => o.recommended) ?? json.data.options[0];
        if (rec) {
          setSelectedIdx(rec.index);
          onSelectRoute(rec.geometry);
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Route comparison failed");
    } finally {
      setLoading(false);
    }
  }, [origin, destination, onSelectRoute]);

  React.useEffect(() => {
    if (origin && destination) load();
  }, [origin, destination, load]);

  if (!origin || !destination) return null;

  const selectRoute = (opt: RouteOption) => {
    setSelectedIdx(opt.index);
    onSelectRoute(opt.geometry);
    toast.success(`Selected ${opt.label} route`);
  };

  if (loading && options.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <RouteIcon className="h-4 w-4 text-sky-500" /> Route Options
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Comparing routes…
        </CardContent>
      </Card>
    );
  }

  if (options.length === 0) return null;

  const visible = expanded ? options : options.slice(0, 2);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2"><RouteIcon className="h-4 w-4 text-sky-500" /> Route Options</span>
          <Badge variant="outline" className="text-xs">{options.length} found</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {visible.map((opt, i) => {
          const meta = LABEL_META[opt.label] ?? LABEL_META.alternative;
          const riskMeta = RISK_META[opt.riskLevel as keyof typeof RISK_META] ?? RISK_META.low;
          const isSelected = selectedIdx === opt.index;
          return (
            <motion.button
              key={opt.index}
              type="button"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => selectRoute(opt)}
              className={`relative w-full overflow-hidden rounded-lg border p-3 text-left transition ${
                isSelected ? "border-sky-400 bg-sky-50 dark:bg-sky-950/20 ring-1 ring-sky-400/40" : "hover:border-foreground/30 hover:bg-accent/40"
              } ${opt.recommended ? "border-l-4 border-l-emerald-400" : ""}`}
            >
              {opt.recommended && (
                <span className="absolute right-2 top-2 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                  Recommended
                </span>
              )}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full ${meta.bg} ${meta.color}`}>{meta.icon}</span>
                  <span className="text-sm font-semibold capitalize">{opt.label}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-sky-600" />}
                </div>
                <span className={`text-xs font-bold tabular-nums ${riskMeta.color}`}>{opt.riskScore}/100</span>
              </div>
              <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                <span>📏 {opt.distanceKm.toFixed(1)} km</span>
                <span>⏱ ~{opt.durationMin} min</span>
                <span className={opt.severeCount > 0 ? "text-red-600 dark:text-red-400" : ""}>
                  ⚠ {opt.hazardCount} hazard{opt.hazardCount !== 1 ? "s" : ""}
                  {opt.severeCount > 0 ? ` (${opt.severeCount} severe)` : ""}
                </span>
              </div>
              {/* Risk bar */}
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={riskMeta.bg}
                  style={{ width: `${opt.riskScore}%` }}
                />
              </div>
            </motion.button>
          );
        })}
        {options.length > 2 && (
          <Button variant="ghost" size="sm" className="w-full gap-1 text-xs" onClick={() => setExpanded((v) => !v)}>
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? "Show less" : `Show ${options.length - 2} more`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
