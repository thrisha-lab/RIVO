"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wind, AlertTriangle, Loader2, CloudOff } from "lucide-react";
import type { AirQualityInfo } from "@/lib/types";

interface Props {
  aq: AirQualityInfo | null;
  loading: boolean;
}

export default function AirQualityCard({ aq, loading }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wind className="h-4 w-4 text-teal-500" /> Air Quality
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && !aq ? (
          <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking air quality…
          </div>
        ) : !aq ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <CloudOff className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Air quality data unavailable.</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {/* Main AQI display */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-sm"
                  style={{ backgroundColor: aq.color }}
                >
                  <span className="text-lg font-bold tabular-nums">{Math.round(aq.europeanAqi)}</span>
                </div>
                <div>
                  <div className="text-sm font-semibold">{aq.level}</div>
                  <div className="text-xs text-muted-foreground">European AQI</div>
                </div>
              </div>
              {aq.mask && (
                <Badge variant="outline" className="border-orange-400/50 text-orange-600 dark:text-orange-400">
                  😷 Mask advised
                </Badge>
              )}
            </div>

            {/* Pollutant breakdown */}
            <div className="grid grid-cols-4 gap-1.5 text-center">
              <Pollutant label="PM2.5" value={aq.pm25} unit="µg" warn={aq.pm25 >= 35} />
              <Pollutant label="PM10" value={aq.pm10} unit="µg" warn={aq.pm10 >= 70} />
              <Pollutant label="NO₂" value={aq.no2} unit="µg" warn={aq.no2 >= 40} />
              <Pollutant label="O₃" value={aq.o3} unit="µg" warn={aq.o3 >= 100} />
            </div>

            {/* Advisory */}
            <div className="rounded-lg border bg-muted/30 p-2.5">
              <p className="text-xs leading-relaxed text-muted-foreground">{aq.advisory}</p>
              {aq.pollutantAdvisory && (
                <p className="mt-1 flex items-start gap-1 text-xs text-orange-600 dark:text-orange-400">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                  {aq.pollutantAdvisory}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

function Pollutant({ label, value, unit, warn }: { label: string; value: number; unit: string; warn?: boolean }) {
  return (
    <div className={`rounded-md border p-1.5 ${warn ? "border-orange-400/50 bg-orange-50 dark:bg-orange-950/20" : "bg-muted/20"}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-bold tabular-nums">{value.toFixed(0)}</div>
      <div className="text-[9px] text-muted-foreground">{unit}</div>
    </div>
  );
}
