"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sun, AlertTriangle, Loader2, CloudOff } from "lucide-react";
import type { WeatherInfo } from "@/lib/types";
import { classifyUv, formatBurnTime } from "@/lib/uv-service";

interface Props {
  weather: WeatherInfo | null;
  loading: boolean;
}

export default function UvIndexCard({ weather, loading }: Props) {
  const uv = weather?.uvIndex;
  const classified = uv !== undefined ? classifyUv(uv) : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sun className="h-4 w-4 text-amber-500" /> UV Index
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {loading && !weather ? (
          <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : !classified ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <CloudOff className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">UV data unavailable.</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm"
                  style={{ backgroundColor: classified.color }}
                >
                  <Sun className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xl font-bold tabular-nums">{classified.uvIndex.toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground">{classified.level}</div>
                </div>
              </div>
              {classified.sunscreen && (
                <Badge variant="outline" className="border-orange-400/50 text-orange-600 dark:text-orange-400 text-[10px]">
                  🧴 SPF 50+
                </Badge>
              )}
            </div>
            {/* Burn time bar */}
            <div>
              <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Skin burn risk</span>
                <span className="font-medium">{formatBurnTime(classified.burnTimeMin)}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, (60 - classified.burnTimeMin) / 60 * 100)}%`, backgroundColor: classified.color }}
                />
              </div>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{classified.advisory}</p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
