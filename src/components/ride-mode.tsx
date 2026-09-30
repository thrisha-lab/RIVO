"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, Clock, Navigation, Volume2, VolumeX, AlertTriangle, Bike, Zap, CloudRain, Wind, Eye } from "lucide-react";
import { RISK_META } from "@/lib/api-client";
import type { RiskAssessmentData, AIExplanation } from "@/lib/types";
import RiskGauge from "@/components/risk-gauge";

interface Props {
  open: boolean;
  onClose: () => void;
  risk: RiskAssessmentData | null;
  destination: { lat: number; lng: number; label?: string } | null;
  voiceEnabled: boolean;
  onToggleVoice: (v: boolean) => void;
  tripElapsedSec: number;
  aiExplanation: AIExplanation | null;
}

function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function RideMode({
  open,
  onClose,
  risk,
  destination,
  voiceEnabled,
  onToggleVoice,
  tripElapsedSec,
  aiExplanation,
}: Props) {
  if (!risk) return null;
  const meta = RISK_META[risk.level];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[900] flex flex-col bg-gradient-to-b from-background via-background to-muted/40"
        >
          {/* Top bar: trip timer + close */}
          <div className="flex items-center justify-between px-4 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5">
                <motion.span
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="h-2 w-2 rounded-full bg-emerald-500"
                />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Riding</span>
              </div>
              <div className="flex items-center gap-1 text-sm font-bold tabular-nums">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {fmtDuration(tripElapsedSec)}
              </div>
            </div>
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded-full border bg-background/80 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur transition hover:bg-accent"
              aria-label="Exit ride mode"
            >
              <X className="h-4 w-4" /> Exit
            </button>
          </div>

          {/* Main: big risk gauge */}
          <div className="flex flex-1 flex-col items-center justify-center px-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              <RiskGauge score={risk.score} level={risk.level} size={240} />
            </motion.div>

            <motion.div
              key={risk.level}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="mt-4 text-center"
            >
              <div className={`text-2xl font-black ${meta.color}`}>{meta.label}</div>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">{risk.recommendation}</p>
            </motion.div>

            {/* Key condition chips */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {risk.weather && risk.weather.precipMm >= 1 && (
                <Chip icon={<CloudRain className="h-3.5 w-3.5" />} label={`${risk.weather.precipMm.toFixed(1)}mm rain`} warn />
              )}
              {risk.weather && risk.weather.windGustKph >= 35 && (
                <Chip icon={<Wind className="h-3.5 w-3.5" />} label={`gust ${Math.round(risk.weather.windGustKph)}km/h`} warn />
              )}
              {risk.weather && risk.weather.visibilityM < 2500 && (
                <Chip icon={<Eye className="h-3.5 w-3.5" />} label={`vis ${(risk.weather.visibilityM / 1000).toFixed(1)}km`} warn />
              )}
              {risk.hazards.activeCount > 0 && (
                <Chip icon={<AlertTriangle className="h-3.5 w-3.5" />} label={`${risk.hazards.activeCount} hazards`} warn={risk.hazards.severeCount > 0} />
              )}
              {risk.weather && (
                <Chip icon={<Zap className="h-3.5 w-3.5" />} label={`${Math.round(risk.weather.tempC)}°C`} />
              )}
            </div>

            {/* ETA / distance */}
            {risk.route && (
              <div className="mt-5 flex items-center gap-6 rounded-2xl border bg-card/60 px-6 py-3">
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">ETA</div>
                  <div className="text-xl font-bold tabular-nums">{risk.route.durationMin ?? "—"}<span className="text-sm text-muted-foreground">min</span></div>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Distance</div>
                  <div className="text-xl font-bold tabular-nums">{risk.route.distanceKm.toFixed(1)}<span className="text-sm text-muted-foreground">km</span></div>
                </div>
                {risk.impact && risk.impact.extraMinutes > 0 && (
                  <>
                    <div className="h-8 w-px bg-border" />
                    <div className="text-center">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">+Delay</div>
                      <div className="text-xl font-bold tabular-nums text-orange-500">+{risk.impact.extraMinutes}<span className="text-sm">min</span></div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* AI tip (if available) */}
            {aiExplanation && aiExplanation.tips.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 max-w-md rounded-xl border border-sky-400/30 bg-sky-50/50 p-3 text-center dark:bg-sky-950/20"
              >
                <div className="flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                  <Shield className="h-3 w-3" /> AI Safety Tip
                </div>
                <p className="mt-1 text-sm">{aiExplanation.tips[0]}</p>
              </motion.div>
            )}
          </div>

          {/* Bottom: voice toggle + destination */}
          <div className="space-y-3 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            {destination && (
              <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                <Navigation className="h-3.5 w-3.5 text-sky-500" />
                <span className="font-medium text-foreground">→ {destination.label}</span>
              </div>
            )}
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => onToggleVoice(!voiceEnabled)}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition ${
                  voiceEnabled ? "bg-sky-600 text-white" : "border bg-background text-muted-foreground hover:bg-accent"
                }`}
                aria-label={voiceEnabled ? "Mute voice" : "Enable voice"}
              >
                {voiceEnabled ? <Volume2 className="h-4 w-4 animate-pulse" /> : <VolumeX className="h-4 w-4" />}
                {voiceEnabled ? "Voice on" : "Voice off"}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Chip({ icon, label, warn }: { icon: React.ReactNode; label: string; warn?: boolean }) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
        warn ? "border-orange-400/50 bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300" : "bg-card/60 text-foreground"
      }`}
    >
      {icon}
      {label}
    </div>
  );
}
