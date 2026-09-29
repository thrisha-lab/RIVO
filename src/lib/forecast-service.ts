/**
 * Hourly weather forecast service — Open-Meteo.
 * Powers the "best departure time" recommender.
 */
import type { WeatherSnapshot } from "@/lib/risk-engine";
import { describeWeatherCode } from "@/lib/weather-service";
import { weatherRisk } from "@/lib/risk-engine";

export interface ForecastHour {
  time: string; // ISO
  hour: number; // 0..23
  tempC: number;
  apparentTempC: number;
  windSpeedKph: number;
  windGustKph: number;
  precipMm: number;
  precipProbability: number; // 0..1
  humidity: number;
  visibilityM: number;
  weatherCode: number;
  isDay: boolean;
  riskScore: number; // 0..100 weather-only contribution
}

export interface DepartureWindow {
  hour: number;
  iso: string;
  riskScore: number;
  label: string;
  summary: string;
}

export async function getHourlyForecast(
  lat: number,
  lng: number,
  hours = 12,
): Promise<ForecastHour[]> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,apparent_temperature,wind_speed_10m,wind_gusts_10m,precipitation,precipitation_probability,relative_humidity_2m,visibility,weather_code,is_day&forecast_days=2&timezone=auto`;
  try {
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      hourly: {
        time: string[];
        temperature_2m: number[];
        apparent_temperature: number[];
        wind_speed_10m: number[];
        wind_gusts_10m: number[];
        precipitation: number[];
        precipitation_probability: number[];
        relative_humidity_2m: number[];
        visibility: number[];
        weather_code: number[];
        is_day: number[];
      };
    };
    const h = data.hourly;
    const now = Date.now();
    const out: ForecastHour[] = [];
    for (let i = 0; i < h.time.length; i++) {
      const t = new Date(h.time[i]).getTime();
      if (t < now - 30 * 60 * 1000) continue; // skip past
      const snap: WeatherSnapshot = {
        tempC: h.temperature_2m[i],
        apparentTempC: h.apparent_temperature[i],
        windSpeedKph: h.wind_speed_10m[i],
        windGustKph: h.wind_gusts_10m[i],
        precipMm: h.precipitation[i],
        precipProbability: (h.precipitation_probability[i] ?? 0) / 100,
        humidity: h.relative_humidity_2m[i],
        visibilityM: h.visibility?.[i] ?? 10000,
        cloudCover: 0,
        weatherCode: h.weather_code[i],
        isDay: h.is_day[i] === 1,
      };
      out.push({
        time: h.time[i],
        hour: new Date(h.time[i]).getHours(),
        tempC: snap.tempC,
        apparentTempC: snap.apparentTempC,
        windSpeedKph: snap.windSpeedKph,
        windGustKph: snap.windGustKph,
        precipMm: snap.precipMm,
        precipProbability: snap.precipProbability,
        humidity: snap.humidity,
        visibilityM: snap.visibilityM,
        weatherCode: snap.weatherCode,
        isDay: snap.isDay,
        riskScore: weatherRisk(snap),
      });
      if (out.length >= hours) break;
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Recommend the best departure window over the next N hours.
 * Considers weather risk + daylight (penalize deep night) + a small
 * "sooner is better" tiebreak so we don't always push riders to wait.
 */
export function recommendBestDeparture(hours: ForecastHour[]): {
  best: DepartureWindow | null;
  worst: DepartureWindow | null;
  windows: DepartureWindow[];
} {
  if (hours.length === 0) return { best: null, worst: null, windows: [] };
  const windows: DepartureWindow[] = hours.map((h, idx) => {
    let score = h.riskScore;
    // Penalize very late night (0–4am) for safety.
    if (h.hour >= 0 && h.hour < 5) score += 18;
    // Small sooner-is-better tiebreak.
    score += idx * 0.5;
    score = Math.min(100, Math.max(0, Math.round(score)));
    return {
      hour: h.hour,
      iso: h.time,
      riskScore: score,
      label: formatHourLabel(h.time),
      summary: `${describeWeatherCode(h.weatherCode)}, ${Math.round(h.tempC)}°C, ${
        h.precipMm > 0 ? `${h.precipMm.toFixed(1)}mm rain` : `${Math.round(h.precipProbability * 100)}% rain`
      }, gust ${Math.round(h.windGustKph)}km/h`,
    };
  });
  const sorted = [...windows].sort((a, b) => a.riskScore - b.riskScore);
  return {
    best: sorted[0],
    worst: sorted[sorted.length - 1],
    windows,
  };
}

function formatHourLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const tmr = new Date(now);
  tmr.setDate(now.getDate() + 1);
  const isTmr = d.toDateString() === tmr.toDateString();
  const hh = d.getHours();
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  const prefix = sameDay ? "Today" : isTmr ? "Tomorrow" : d.toLocaleDateString(undefined, { weekday: "short" });
  return `${prefix} ${h12}${ampm}`;
}
