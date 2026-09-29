/**
 * Weather service — Open-Meteo (free, no API key required).
 * Includes a DB cache (WeatherCache) to limit upstream calls.
 */
import { db } from "@/lib/db";
import type { WeatherSnapshot } from "@/lib/risk-engine";

const OPEN_METEO = "https://api.open-meteo.com/v1/forecast";

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    wind_speed_10m: number;
    wind_gusts_10m: number;
    wind_direction_10m?: number;
    precipitation: number;
    relative_humidity_2m: number;
    visibility: number;
    cloud_cover: number;
    weather_code: number;
    is_day: number;
    uv_index?: number;
  };
}

/** Round to ~3 decimals (~110m) for cache keying. */
function roundCoord(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export async function getWeather(lat: number, lng: number): Promise<WeatherSnapshot | null> {
  const rLat = roundCoord(lat);
  const rLng = roundCoord(lng);

  // Cache lookup (15 min TTL).
  const now = new Date();
  const cached = await db.weatherCache.findFirst({
    where: {
      lat: rLat,
      lng: rLng,
      expiresAt: { gt: now },
    },
    orderBy: { fetchedAt: "desc" },
  });
  if (cached) {
    try {
      return JSON.parse(cached.data) as WeatherSnapshot;
    } catch {
      // fall through to fetch
    }
  }

  try {
    const url = `${OPEN_METEO}?latitude=${rLat}&longitude=${rLng}&current=temperature_2m,apparent_temperature,wind_speed_10m,wind_gusts_10m,wind_direction_10m,precipitation,relative_humidity_2m,visibility,cloud_cover,weather_code,is_day,uv_index&timezone=auto`;
    const res = await fetch(url, {
      // cache weather 10 min at fetch layer too
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as OpenMeteoResponse;
    const c = data.current;
    const snapshot: WeatherSnapshot = {
      tempC: c.temperature_2m,
      apparentTempC: c.apparent_temperature,
      windSpeedKph: c.wind_speed_10m,
      windGustKph: c.wind_gusts_10m,
      precipMm: c.precipitation,
      precipProbability: c.precipitation > 0 ? 1 : 0,
      humidity: c.relative_humidity_2m,
      visibilityM: c.visibility ?? 10000,
      cloudCover: c.cloud_cover,
      weatherCode: c.weather_code,
      isDay: c.is_day === 1,
      uvIndex: c.uv_index,
      windDirectionDeg: c.wind_direction_10m,
    };

    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
    await db.weatherCache.create({
      data: {
        lat: rLat,
        lng: rLng,
        data: JSON.stringify(snapshot),
        expiresAt,
      },
    });
    return snapshot;
  } catch {
    return null;
  }
}

/** WMO weather code → human label. */
export function describeWeatherCode(code: number): string {
  const map: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
  };
  return map[code] ?? "Unknown";
}

/** Returns precip probability (0..1) by re-fetching forecast if needed. */
export async function getPrecipProbability(lat: number, lng: number): Promise<number> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=precipitation_probability&forecast_days=1&timezone=auto`;
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) return 0;
    const data = (await res.json()) as {
      hourly: { precipitation_probability: number[]; time: string[] };
    };
    const nowIdx = nearestHourIndex(data.hourly.time);
    const probs = data.hourly.precipitation_probability;
    const next6 = probs.slice(nowIdx, nowIdx + 6).filter((p) => typeof p === "number");
    if (next6.length === 0) return 0;
    return Math.max(...next6) / 100;
  } catch {
    return 0;
  }
}

function nearestHourIndex(times: string[]): number {
  const now = Date.now();
  let best = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < times.length; i++) {
    const t = new Date(times[i]).getTime();
    const diff = Math.abs(t - now);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  return best;
}
