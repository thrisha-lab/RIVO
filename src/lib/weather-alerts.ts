/**
 * Weather alert rules — evaluates forecast data and creates AlertRecords for
 * riders who would be affected. Runs server-side, deterministic.
 *
 * Rules:
 * - Severe weather: heavy rain (≥4mm forecast), strong gusts (≥50km/h), thunderstorms
 * - Creates alerts for riders with recent risk assessments near the location.
 */
import { db } from "@/lib/db";
import type { ForecastHour } from "@/lib/forecast-service";

/** Evaluate forecast hours and return any alert-worthy events. */
export function evaluateWeatherAlerts(hours: ForecastHour[]): {
  type: "severe_weather";
  severity: "info" | "warning" | "critical";
  title: string;
  body: string;
  data: { hour: number; iso: string; precipMm: number; windGustKph: number };
}[] {
  const alerts: {
    type: "severe_weather";
    severity: "info" | "warning" | "critical";
    title: string;
    body: string;
    data: { hour: number; iso: string; precipMm: number; windGustKph: number };
  }[] = [];

  for (const h of hours.slice(0, 6)) {
    // Critical: thunderstorm code 95-99, or very heavy rain + strong wind
    const isThunderstorm = h.weatherCode >= 95;
    const veryHeavyRain = h.precipMm >= 8;
    const strongGust = h.windGustKph >= 50;

    if (isThunderstorm || (veryHeavyRain && strongGust)) {
      alerts.push({
        type: "severe_weather",
        severity: "critical",
        title: `Thunderstorm alert at ${formatHour(h.time)}`,
        body: `Thunderstorm${veryHeavyRain ? ` with ${h.precipMm.toFixed(1)}mm rain` : ""} expected. Gusts up to ${Math.round(h.windGustKph)} km/h. Avoid riding if possible.`,
        data: { hour: h.hour, iso: h.time, precipMm: h.precipMm, windGustKph: h.windGustKph },
      });
      break; // one critical alert is enough
    }
    if (veryHeavyRain || strongGust) {
      alerts.push({
        type: "severe_weather",
        severity: "warning",
        title: `Severe weather at ${formatHour(h.time)}`,
        body: `${veryHeavyRain ? `Heavy rain (${h.precipMm.toFixed(1)}mm)` : ""}${veryHeavyRain && strongGust ? " + " : ""}${strongGust ? `strong gusts (${Math.round(h.windGustKph)} km/h)` : ""} expected. Plan accordingly.`,
        data: { hour: h.hour, iso: h.time, precipMm: h.precipMm, windGustKph: h.windGustKph },
      });
      break;
    }
  }
  return alerts;
}

/**
 * Persist weather alerts for riders who recently assessed risk near the location.
 * Best-effort: never throws.
 */
export async function createWeatherAlertsForNearbyRiders(
  lat: number,
  lng: number,
  alerts: { type: string; severity: string; title: string; body: string; data?: object }[],
): Promise<number> {
  if (alerts.length === 0) return 0;
  try {
    const dLat = 0.02; // ~2km
    const dLng = 0.02 / Math.cos((Math.abs(lat) * Math.PI) / 180 || 0.01);
    const recentRisk = await db.riskAssessment.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
        originLat: { gte: lat - dLat, lte: lat + dLat },
        originLng: { gte: lng - dLng, lte: lng + dLng },
      },
      select: { riderId: true },
      distinct: ["riderId"],
      take: 100,
    });
    const riderIds = recentRisk.map((r) => r.riderId);
    if (riderIds.length === 0) return 0;

    const records: { riderId: string; type: string; severity: string; title: string; body: string; data: string | null }[] = [];
    for (const riderId of riderIds) {
      for (const a of alerts) {
        records.push({
          riderId,
          type: a.type,
          severity: a.severity,
          title: a.title,
          body: a.body,
          data: a.data ? JSON.stringify(a.data).slice(0, 1000) : null,
        });
      }
    }
    await db.alertRecord.createMany({ data: records });
    return records.length;
  } catch {
    return 0;
  }
}

function formatHour(iso: string): string {
  const d = new Date(iso);
  const hh = d.getHours();
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12} ${ampm}`;
}
