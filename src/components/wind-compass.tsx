"use client";

import { motion } from "framer-motion";
import { Wind } from "lucide-react";

interface Props {
  windSpeedKph: number;
  windGustKph: number;
  windDirectionDeg?: number; // direction wind is FROM, in degrees (0=N, 90=E, 180=S, 270=W)
}

/**
 * Wind direction compass widget.
 *
 * Shows the wind direction as an arrow on a compass rose, with speed + gust.
 * Helps riders anticipate crosswinds and headwinds.
 *
 * If windDirectionDeg is unavailable, shows a simple speed/gust badge instead.
 */
export default function WindCompass({ windSpeedKph, windGustKph, windDirectionDeg }: Props) {
  const hasDir = typeof windDirectionDeg === "number" && !Number.isNaN(windDirectionDeg);
  const dir = windDirectionDeg ?? 0;
  // Arrow points in the direction the wind is GOING TO (opposite of FROM).
  const toDeg = (dir + 180) % 360;
  const cardinal = cardinalDirection(dir);
  const isStrong = windGustKph >= 35;

  if (!hasDir) {
    return (
      <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${isStrong ? "border-orange-400/50 bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300" : "bg-background/90 text-foreground"}`}>
        <Wind className="h-3 w-3" />
        <span className="font-medium tabular-nums">{Math.round(windSpeedKph)} km/h</span>
        <span className="text-muted-foreground">gust {Math.round(windGustKph)}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${isStrong ? "border-orange-400/50 bg-orange-50 dark:bg-orange-950/30" : "bg-background/90"}`}>
      {/* Compass rose */}
      <div className="relative h-9 w-9 shrink-0">
        <svg viewBox="0 0 40 40" className="h-full w-full">
          {/* Outer circle */}
          <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted-foreground/30" />
          {/* Cardinal ticks */}
          <text x="20" y="7" textAnchor="middle" className="fill-muted-foreground text-[7px] font-bold">N</text>
          <text x="20" y="37" textAnchor="middle" className="fill-muted-foreground text-[7px] font-bold">S</text>
          <text x="34" y="22" textAnchor="middle" className="fill-muted-foreground text-[7px] font-bold">E</text>
          <text x="6" y="22" textAnchor="middle" className="fill-muted-foreground text-[7px] font-bold">W</text>
          {/* Wind arrow (points TO direction) */}
          <motion.g
            style={{ transformOrigin: "20px 20px" }}
            initial={{ rotate: 0 }}
            animate={{ rotate: toDeg }}
            transition={{ type: "spring", stiffness: 120, damping: 15 }}
          >
            <path
              d="M 20 10 L 16 22 L 20 19 L 24 22 Z"
              fill={isStrong ? "#f97316" : "#0ea5e9"}
              stroke="white"
              strokeWidth="0.5"
            />
          </motion.g>
          {/* Center dot */}
          <circle cx="20" cy="20" r="1.5" className="fill-muted-foreground" />
        </svg>
      </div>
      {/* Speed info */}
      <div className="flex flex-col leading-tight">
        <span className={`font-bold tabular-nums ${isStrong ? "text-orange-600 dark:text-orange-400" : "text-foreground"}`}>
          {Math.round(windSpeedKph)} <span className="text-[9px] font-normal text-muted-foreground">km/h</span>
        </span>
        <span className="text-[10px] text-muted-foreground">
          gust {Math.round(windGustKph)} · {cardinal}
        </span>
      </div>
    </div>
  );
}

/** Convert degrees to cardinal direction (N, NNE, NE, ...). */
function cardinalDirection(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const idx = Math.round(deg / 22.5) % 16;
  return dirs[idx];
}
