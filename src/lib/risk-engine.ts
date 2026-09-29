/**
 * RiderGuard deterministic risk engine.
 *
 * This is the SINGLE SOURCE OF TRUTH for risk scoring.
 * AI may NEVER compute or override this score — it may only explain it.
 *
 * Inputs: weather snapshot, time-of-day, hazard density along route,
 * route distance, rider speed, and confidence factors.
 * Output: 0..100 score + level + weighted factors.
 */

export type RiskLevel = "low" | "moderate" | "high" | "severe";

export interface WeatherSnapshot {
  tempC: number;
  apparentTempC: number;
  windSpeedKph: number;
  windGustKph: number;
  precipMm: number;
  precipProbability: number; // 0..1
  humidity: number; // %
  visibilityM: number;
  cloudCover: number; // %
  weatherCode: number; // WMO code
  isDay: boolean;
  uvIndex?: number;
}

export interface HazardDensityInput {
  /** Active hazards within route buffer (count). */
  activeCount: number;
  /** Critical/high severity hazards within buffer. */
  severeCount: number;
}

export interface RouteRiskInput {
  distanceKm: number;
  durationMin: number;
}

export interface RiskFactor {
  factor: string;
  weight: number; // contribution to score (0..100 scale share)
  detail: string;
}

export interface RiskAssessmentResult {
  score: number; // 0..100
  level: RiskLevel;
  factors: RiskFactor[];
  recommendation: string;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Weather-derived risk contribution (0..100). */
export function weatherRisk(w: WeatherSnapshot): number {
  let risk = 0;

  // Precipitation is the dominant factor for two-wheelers.
  // Light rain starts at 12, moderate 30, heavy 55.
  const rainScore =
    w.precipMm >= 10 ? 55 : w.precipMm >= 4 ? 38 : w.precipMm >= 1 ? 22 : w.precipMm > 0 ? 12 : 0;
  // Precipitation probability scales baseline even if not currently raining.
  const probBoost = w.precipProbability > 0.6 ? 8 : w.precipProbability > 0.3 ? 4 : 0;
  risk += rainScore + probBoost;

  // Wind: gusty wind is dangerous for two-wheelers.
  const gust = w.windGustKph ?? w.windSpeedKph;
  const windScore =
    gust >= 60 ? 35 : gust >= 45 ? 24 : gust >= 35 ? 16 : gust >= 25 ? 9 : 0;
  risk += windScore;

  // Visibility: low visibility is high risk.
  const visScore =
    w.visibilityM < 500 ? 28 : w.visibilityM < 1000 ? 18 : w.visibilityM < 2500 ? 9 : 0;
  risk += visScore;

  // Temperature extremes.
  const t = w.apparentTempC ?? w.tempC;
  const tempScore = t <= 0 ? 14 : t <= 5 ? 9 : t >= 38 ? 12 : t >= 35 ? 8 : 0;
  risk += tempScore;

  return clamp(risk, 0, 100);
}

/** Time-of-day risk contribution (0..100). */
export function timeOfDayRisk(date: Date = new Date()): number {
  const h = date.getHours();
  // Late night / pre-dawn is highest risk.
  if (h >= 0 && h < 5) return 22;
  if (h >= 22) return 16;
  // Dawn glare window.
  if (h >= 6 && h < 8) return 8;
  // Dusk glare window.
  if (h >= 17 && h < 19) return 10;
  return 4;
}

/** Hazard density contribution (0..100). */
export function hazardRisk(d: HazardDensityInput): number {
  let risk = 0;
  risk += Math.min(d.activeCount * 6, 40);
  risk += Math.min(d.severeCount * 12, 35);
  return clamp(risk, 0, 100);
}

/** Route fatigue contribution (0..100). */
export function routeRisk(r: RouteRiskInput): number {
  let risk = 0;
  // Long rides increase fatigue & exposure.
  risk += Math.min(r.distanceKm * 0.6, 18);
  // Very long durations.
  risk += r.durationMin > 90 ? 12 : r.durationMin > 60 ? 7 : 0;
  return clamp(risk, 0, 100);
}

/**
 * Combine all contributions into a final 0..100 score.
 * Weighted blend so weather stays the dominant signal but
 * hazards & time-of-day can elevate severity meaningfully.
 */
export function assessRisk(opts: {
  weather: WeatherSnapshot | null;
  hazards: HazardDensityInput;
  route: RouteRiskInput | null;
  now?: Date;
}): RiskAssessmentResult {
  const factors: RiskFactor[] = [];
  const w = opts.weather;
  const wRisk = w ? weatherRisk(w) : 0;
  const tRisk = timeOfDayRisk(opts.now ?? new Date());
  const hRisk = hazardRisk(opts.hazards);
  const rRisk = opts.route ? routeRisk(opts.route) : 0;

  // Weighted blend (must sum to 1.0).
  const W = { weather: 0.5, hazards: 0.25, time: 0.15, route: 0.1 };

  const score = Math.round(
    clamp(wRisk * W.weather + hRisk * W.hazards + tRisk * W.time + rRisk * W.route, 0, 100),
  );

  if (w) {
    factors.push({
      factor: "Weather",
      weight: Math.round(wRisk * W.weather),
      detail: describeWeather(w),
    });
  }
  factors.push({
    factor: "Road hazards",
    weight: Math.round(hRisk * W.hazards),
    detail: `${opts.hazards.activeCount} active report(s) nearby, ${opts.hazards.severeCount} severe.`,
  });
  factors.push({
    factor: "Time of day",
    weight: Math.round(tRisk * W.time),
    detail: describeTime(opts.now ?? new Date()),
  });
  if (opts.route) {
    factors.push({
      factor: "Route exposure",
      weight: Math.round(rRisk * W.route),
      detail: `${opts.route.distanceKm.toFixed(1)} km, ~${opts.route.durationMin} min.`,
    });
  }

  const level: RiskLevel =
    score >= 70 ? "severe" : score >= 45 ? "high" : score >= 25 ? "moderate" : "low";

  return {
    score,
    level,
    factors: factors.sort((a, b) => b.weight - a.weight),
    recommendation: recommendationFor(level, w),
  };
}

function describeWeather(w: WeatherSnapshot): string {
  const parts: string[] = [];
  if (w.precipMm >= 1) parts.push(`${w.precipMm.toFixed(1)} mm rain`);
  else if (w.precipProbability > 0.3) parts.push(`${Math.round(w.precipProbability * 100)}% rain chance`);
  const gust = w.windGustKph ?? w.windSpeedKph;
  if (gust >= 25) parts.push(`gusts ${Math.round(gust)} km/h`);
  if (w.visibilityM < 2500) parts.push(`vis ${(w.visibilityM / 1000).toFixed(1)} km`);
  if (parts.length === 0) parts.push("conditions clear");
  return parts.join(", ");
}

function describeTime(d: Date): string {
  const h = d.getHours();
  if (h >= 0 && h < 5) return "late night / low visibility hours";
  if (h >= 22) return "late evening";
  if (h >= 6 && h < 8) return "dawn (glare risk)";
  if (h >= 17 && h < 19) return "dusk (glare risk)";
  return "daytime";
}

function recommendationFor(level: RiskLevel, w: WeatherSnapshot | null): string {
  if (level === "severe") {
    return "Delay travel if possible. If you must ride, wear full wet-weather gear, reduce speed, and avoid flooded sections.";
  }
  if (level === "high") {
    return "Proceed with caution. Take the safest marked route, extend braking distance, and plan a safe stop en route.";
  }
  if (level === "moderate") {
    return "Conditions are acceptable but watch for changing weather. Keep your visor clean and stay visible.";
  }
  return "Conditions look good for riding. Stay hydrated and ride defensively.";
}

export const SEVERITY_ORDER: Record<string, number> = {
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

export const HAZARD_TYPES = [
  "pothole",
  "flooding",
  "roadblock",
  "construction",
  "accident",
  "poor_lighting",
  "animal",
  "slippery",
  "other",
] as const;

export type HazardType = (typeof HAZARD_TYPES)[number];

export const HAZARD_LABELS: Record<string, string> = {
  pothole: "Pothole",
  flooding: "Flooding",
  roadblock: "Roadblock",
  construction: "Construction",
  accident: "Accident",
  poor_lighting: "Poor lighting",
  animal: "Animal on road",
  slippery: "Slippery surface",
  other: "Other hazard",
};
