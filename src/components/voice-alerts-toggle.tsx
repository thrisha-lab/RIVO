"use client";

import * as React from "react";
import { Volume2, VolumeX, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { RiskAssessmentData } from "@/lib/types";

interface Props {
  risk: RiskAssessmentData | null;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

/**
 * Voice alerts mode — uses the Web Speech API to announce risk changes
 * and important conditions. Hands-free safety for riders in motion.
 *
 * NOTE: Uses the browser's built-in SpeechSynthesis (no external API).
 * The AI only narrates the already-computed deterministic risk — never
 * computes or overrides it.
 */
export default function VoiceAlertsToggle({ risk, enabled, onToggle }: Props) {
  const lastSpokenRef = React.useRef<string>("");

  // Speak when risk level changes or a significant threshold is crossed.
  React.useEffect(() => {
    if (!enabled || !risk || typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const levelKey = risk.level;
    const hazardKey = risk.hazards.severeCount > 0 ? `severe-${risk.hazards.severeCount}` : "";
    const rainKey = risk.weather && risk.weather.precipMm >= 1 ? `rain-${Math.round(risk.weather.precipMm)}` : "";
    const sigKey = `${levelKey}|${hazardKey}|${rainKey}`;

    if (sigKey === lastSpokenRef.current) return;
    lastSpokenRef.current = sigKey;

    const utterance = buildUtterance(risk);
    if (!utterance) return;

    // Debounce: don't speak too frequently.
    const u = new SpeechSynthesisUtterance(utterance);
    u.rate = 1.0;
    u.pitch = 1.0;
    u.volume = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }, [risk, enabled]);

  const toggle = () => {
    const next = !enabled;
    onToggle(next);
    if (next) {
      // Request permission implicitly by speaking a test phrase.
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance("Voice alerts on. I'll announce important risk changes.");
        u.rate = 1.0;
        window.speechSynthesis.speak(u);
        toast.success("Voice alerts enabled", {
          description: "RIVO will speak risk changes hands-free.",
        });
      } else {
        toast.error("Voice synthesis not supported in this browser.");
        onToggle(false);
      }
    } else {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      toast("Voice alerts off");
    }
  };

  return (
    <Button
      type="button"
      onClick={toggle}
      variant={enabled ? "default" : "outline"}
      size="sm"
      className={`gap-1.5 ${enabled ? "bg-gradient-to-r from-sky-600 to-emerald-600 text-white" : ""}`}
      aria-pressed={enabled}
      aria-label={enabled ? "Disable voice alerts" : "Enable voice alerts"}
    >
      {enabled ? <Volume2 className="h-3.5 w-3.5 animate-pulse" /> : <VolumeX className="h-3.5 w-3.5" />}
      <span className="hidden sm:inline">{enabled ? "Voice on" : "Voice"}</span>
    </Button>
  );
}

function buildUtterance(risk: RiskAssessmentData): string | null {
  const parts: string[] = [];

  // Level announcement with context
  if (risk.level === "severe") {
    parts.push("Severe risk. Consider delaying your trip.");
  } else if (risk.level === "high") {
    parts.push("High risk detected. Ride with extra caution.");
  } else if (risk.level === "moderate") {
    parts.push("Moderate risk. Stay alert.");
  }
  // Only announce low risk once when conditions clear (handled by sigKey dedup)
  else if (risk.score < 15) {
    parts.push("Conditions are clear. Safe riding.");
  }

  // Severe hazards
  if (risk.hazards.severeCount > 0) {
    parts.push(`${risk.hazards.severeCount} severe hazard${risk.hazards.severeCount !== 1 ? "s" : ""} on your route.`);
  }

  // Heavy rain
  if (risk.weather) {
    if (risk.weather.precipMm >= 4) {
      parts.push("Heavy rain. Reduce speed.");
    } else if (risk.weather.precipMm >= 1) {
      parts.push("Rain detected. Wet road ahead.");
    }
    if (risk.weather.windGustKph >= 40) {
      parts.push(`Strong gusts at ${Math.round(risk.weather.windGustKph)} kilometers per hour.`);
    }
  }

  // Delivery impact
  if (risk.impact && risk.impact.extraMinutes >= 10) {
    parts.push(`Expect ${risk.impact.extraMinutes} extra minutes due to conditions.`);
  }

  return parts.length > 0 ? parts.join(" ") : null;
}
