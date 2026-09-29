/**
 * Delivery impact estimator.
 *
 * Estimates how much extra time a rider should budget for a trip given the
 * current risk level. Uses the deterministic risk score (never overrides it).
 *
 * Factors:
 * - Weather slows riders (rain → ~20-30% slower, wind → ~10-15% slower)
 * - Hazards on route add small detour/attention time
 * - Low visibility reduces average speed
 * - Night riding is inherently slower
 */
import type { RiskAssessmentResult, WeatherSnapshot } from "@/lib/risk-engine";

export interface DeliveryImpact {
  baseDurationMin: number;       // original ETA
  adjustedDurationMin: number;   // adjusted for conditions
  extraMinutes: number;          // difference
  slowDownPct: number;           // percentage slowdown
  reason: string;                // human-readable explanation
  worthIt: "yes" | "caution" | "no";  // simple guidance
  worthItReason: string;
}

/**
 * Estimate delivery impact from a computed risk + weather.
 */
export function estimateDeliveryImpact(
  risk: RiskAssessmentResult,
  weather: WeatherSnapshot | null,
  route: { distanceKm: number; durationMin: number } | null,
): DeliveryImpact | null {
  if (!route || route.durationMin <= 0) return null;

  const base = route.durationMin;
  let slowdown = 0; // fractional, e.g. 0.2 = 20% slower
  const reasons: string[] = [];

  if (weather) {
    if (weather.precipMm >= 10) {
      slowdown += 0.30;
      reasons.push("heavy rain (+30%)");
    } else if (weather.precipMm >= 4) {
      slowdown += 0.20;
      reasons.push("moderate rain (+20%)");
    } else if (weather.precipMm >= 1) {
      slowdown += 0.12;
      reasons.push("light rain (+12%)");
    }

    const gust = weather.windGustKph ?? weather.windSpeedKph;
    if (gust >= 50) {
      slowdown += 0.15;
      reasons.push("strong gusts (+15%)");
    } else if (gust >= 35) {
      slowdown += 0.08;
      reasons.push("windy (+8%)");
    }

    if (weather.visibilityM < 1000) {
      slowdown += 0.15;
      reasons.push("poor visibility (+15%)");
    } else if (weather.visibilityM < 2500) {
      slowdown += 0.07;
      reasons.push("reduced visibility (+7%)");
    }

    if (!weather.isDay) {
      slowdown += 0.05;
      reasons.push("night riding (+5%)");
    }
  }

  // Hazard density adds small detour time (capped)
  const hazardCount = risk.factors.find((f) => f.factor === "Road hazards")?.weight ?? 0;
  if (hazardCount > 5) {
    slowdown += 0.08;
    reasons.push("many road hazards (+8%)");
  }

  // Cap total slowdown at 60%
  slowdown = Math.min(0.6, slowdown);

  const adjusted = Math.round(base * (1 + slowdown));
  const extra = adjusted - base;
  const slowDownPct = Math.round(slowdown * 100);

  let reason: string;
  if (reasons.length === 0) {
    reason = "Conditions are clear — expect normal travel time.";
  } else {
    reason = `Slower due to: ${reasons.join(", ")}.`;
  }

  // "Worth it" guidance: simple heuristic based on risk level + extra time
  let worthIt: DeliveryImpact["worthIt"] = "yes";
  let worthItReason: string;
  if (risk.level === "severe") {
    worthIt = "no";
    worthItReason = "Severe risk — consider delaying or declining this delivery unless urgent.";
  } else if (risk.level === "high" || extra >= 15) {
    worthIt = "caution";
    worthItReason = `High risk or ${extra}+ min delay. Proceed only if the payout justifies the extra time and risk.`;
  } else if (risk.level === "moderate") {
    worthIt = "caution";
    worthItReason = "Moderate risk — acceptable, but ride carefully and budget extra time.";
  } else {
    worthIt = "yes";
    worthItReason = "Low risk — safe to proceed. Ride defensively.";
  }

  return {
    baseDurationMin: base,
    adjustedDurationMin: adjusted,
    extraMinutes: extra,
    slowDownPct,
    reason,
    worthIt,
    worthItReason,
  };
}
