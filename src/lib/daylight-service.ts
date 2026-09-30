/**
 * Sunrise/sunset + daylight service — Open-Meteo daily endpoint.
 * Helps riders plan around daylight hours (dawn glare, dusk, night risk).
 */
import type { WeatherSnapshot } from "@/lib/risk-engine";

export interface DaylightInfo {
  sunrise: string;        // ISO
  sunset: string;         // ISO
  now: string;            // ISO
  isDay: boolean;
  minutesUntilSunset: number | null;
  minutesUntilSunrise: number | null;
  daylightMinutes: number;
  phase: "pre-dawn" | "dawn" | "day" | "dusk" | "night";
}

/** Fetch sunrise/sunset for a location. */
export async function getDaylight(lat: number, lng: number): Promise<DaylightInfo | null> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=sunrise,sunset&timezone=auto&forecast_days=1`;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      daily: { sunrise: string[]; sunset: string[] };
    };
    const sunrise = data.daily.sunrise?.[0];
    const sunset = data.daily.sunset?.[0];
    if (!sunrise || !sunset) return null;

    const now = new Date();
    const sr = new Date(sunrise);
    const ss = new Date(sunset);
    const daylightMin = Math.round((ss.getTime() - sr.getTime()) / 60000);

    let isDay = now >= sr && now <= ss;
    let minutesUntilSunset: number | null = isDay ? Math.round((ss.getTime() - now.getTime()) / 60000) : null;
    let minutesUntilSunrise: number | null = !isDay ? (now < sr ? Math.round((sr.getTime() - now.getTime()) / 60000) : Math.round((sr.getTime() + 86400000 - now.getTime()) / 60000)) : null;

    // Determine phase with 30-min dawn/dusk windows.
    let phase: DaylightInfo["phase"];
    const dawnStart = sr.getTime() - 30 * 60000;
    const dawnEnd = sr.getTime() + 30 * 60000;
    const duskStart = ss.getTime() - 30 * 60000;
    const duskEnd = ss.getTime() + 30 * 60000;
    if (now.getTime() < dawnStart) phase = "pre-dawn";
    else if (now.getTime() < dawnEnd) phase = "dawn";
    else if (now.getTime() < duskStart) phase = "day";
    else if (now.getTime() < duskEnd) phase = "dusk";
    else phase = "night";

    return {
      sunrise,
      sunset,
      now: now.toISOString(),
      isDay,
      minutesUntilSunset,
      minutesUntilSunrise,
      daylightMinutes: daylightMin,
      phase,
    };
  } catch {
    return null;
  }
}

/** Human-readable countdown to sunset/sunrise. */
export function formatCountdown(minutes: number | null, event: "sunset" | "sunrise"): string {
  if (minutes === null) return "";
  if (minutes < 60) return `${minutes}m until ${event}`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m until ${event}`;
}

/** Phase color for UI. */
export function phaseColor(phase: DaylightInfo["phase"]): string {
  switch (phase) {
    case "pre-dawn": return "#6366f1";
    case "dawn": return "#f59e0b";
    case "day": return "#fbbf24";
    case "dusk": return "#f97316";
    case "night": return "#6366f1";
  }
}

/** Phase emoji. */
export function phaseEmoji(phase: DaylightInfo["phase"]): string {
  switch (phase) {
    case "pre-dawn": return "🌌";
    case "dawn": return "🌅";
    case "day": return "☀️";
    case "dusk": return "🌇";
    case "night": return "🌙";
  }
}
