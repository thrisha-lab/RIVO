/**
 * UV index service + classification.
 * Open-Meteo provides uv_index in the current weather endpoint.
 */

export interface UvInfo {
  uvIndex: number;
  level: string;
  color: string;
  textColor: string;
  bgColor: string;
  advisory: string;
  burnTimeMin: number; // estimated minutes to sunburn for fair skin
  sunscreen: boolean;
}

/** Classify UV index into a level + advisory. */
export function classifyUv(uvIndex: number): UvInfo {
  if (uvIndex < 3) {
    return { uvIndex, level: "Low", color: "#10b981", textColor: "text-emerald-700 dark:text-emerald-300", bgColor: "bg-emerald-100 dark:bg-emerald-950/40", advisory: "Minimal sun risk. No protection needed.", burnTimeMin: 60, sunscreen: false };
  }
  if (uvIndex < 6) {
    return { uvIndex, level: "Moderate", color: "#f59e0b", textColor: "text-amber-700 dark:text-amber-300", bgColor: "bg-amber-100 dark:bg-amber-950/40", advisory: "Moderate UV. Wear sunglasses and apply SPF 30+ sunscreen.", burnTimeMin: 30, sunscreen: true };
  }
  if (uvIndex < 8) {
    return { uvIndex, level: "High", color: "#f97316", textColor: "text-orange-700 dark:text-orange-300", bgColor: "bg-orange-100 dark:bg-orange-950/40", advisory: "High UV. Seek shade during midday. Use SPF 50+.", burnTimeMin: 20, sunscreen: true };
  }
  if (uvIndex < 11) {
    return { uvIndex, level: "Very High", color: "#ef4444", textColor: "text-red-700 dark:text-red-300", bgColor: "bg-red-100 dark:bg-red-950/40", advisory: "Very high UV. Limit midday exposure. Wear long sleeves + SPF 50+.", burnTimeMin: 10, sunscreen: true };
  }
  return { uvIndex, level: "Extreme", color: "#991b1b", textColor: "text-red-800 dark:text-red-200", bgColor: "bg-red-200 dark:bg-red-950/60", advisory: "Extreme UV. Avoid outdoor riding 10am-4pm if possible.", burnTimeMin: 5, sunscreen: true };
}

/** Format burn time as a human string. */
export function formatBurnTime(min: number): string {
  if (min >= 60) return `${Math.round(min / 60)}h until sunburn`;
  return `${min}min until sunburn`;
}
