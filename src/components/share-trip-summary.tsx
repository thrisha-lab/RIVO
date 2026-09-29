"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Share2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RISK_META } from "@/lib/api-client";
import type { RiskAssessmentData } from "@/lib/types";
import { toast } from "sonner";

interface Props {
  risk: RiskAssessmentData | null;
  destinationLabel?: string;
  open: boolean;
  onClose: () => void;
}

export default function ShareTripSummary({ risk, destinationLabel, open, onClose }: Props) {
  const [copied, setCopied] = React.useState(false);
  if (!open || !risk) return null;

  const meta = RISK_META[risk.level];
  const lines: string[] = [];
  lines.push("🛡️ RiderGuard Trip Risk Summary");
  lines.push("");
  lines.push(`Risk Score: ${risk.score}/100 ${meta.emoji} ${meta.label}`);
  if (risk.route) {
    lines.push(`Distance: ${risk.route.distanceKm.toFixed(1)} km`);
    if (risk.route.durationMin) lines.push(`Duration: ~${risk.route.durationMin} min`);
  }
  if (destinationLabel) lines.push(`Destination: ${destinationLabel}`);
  if (risk.weather) {
    lines.push(`Weather: ${Math.round(risk.weather.tempC)}°C, ${risk.weather.precipMm.toFixed(1)}mm rain, gust ${Math.round(risk.weather.windGustKph)}km/h`);
  }
  if (risk.hazards.activeCount > 0) {
    lines.push(`Hazards on route: ${risk.hazards.activeCount} (${risk.hazards.severeCount} severe)`);
  }
  lines.push("");
  lines.push("Contributing factors:");
  for (const f of risk.factors) {
    lines.push(`  • ${f.factor} (+${f.weight}): ${f.detail}`);
  }
  lines.push("");
  lines.push(`Recommendation: ${risk.recommendation}`);
  if (risk.impact) {
    lines.push(`Delivery impact: +${risk.impact.extraMinutes} min (${risk.impact.slowDownPct}% slower) — ${risk.impact.worthIt}`);
  }
  lines.push("");
  lines.push("⚠ Risk scores are deterministic. AI explains only — never overrides safety.");
  const text = lines.join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Trip summary copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Clipboard not available");
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "RiderGuard Trip Risk", text });
        onClose();
      } catch {
        /* user cancelled */
      }
    } else {
      copy();
    }
  };

  return (
    <div className="fixed inset-0 z-[860] flex items-end justify-center bg-black/50 p-3 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg"
      >
        <Card className="overflow-hidden shadow-2xl">
          <div className={`flex items-center justify-between px-5 py-3 text-white ${meta.bg}`}>
            <div className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              <span className="text-sm font-bold">Share Trip Summary</span>
            </div>
            <button onClick={onClose} className="rounded-md p-1 hover:bg-white/20" aria-label="Close"><X className="h-4 w-4" /></button>
          </div>
          <CardContent className="space-y-3 p-4">
            <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-xs leading-relaxed">{text}</pre>
            <div className="flex gap-2">
              <Button onClick={share} className="flex-1 gap-1.5">
                <Share2 className="h-4 w-4" /> Share
              </Button>
              <Button onClick={copy} variant="outline" className="flex-1 gap-1.5">
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4" />}
                {copied ? "Copied!" : "Copy text"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
