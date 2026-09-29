/**
 * Air Quality Index (AQI) service — Open-Meteo Air Quality API.
 * Provides PM2.5, PM10, NO2, O3, and European AQI for rider health.
 */
import { db } from "@/lib/db";

const AQ_API = "https://air-quality-api.open-meteo.com/v1/air-quality";

export interface AirQualityData {
  europeanAqi: number;
  pm25: number; // µg/m³
  pm10: number; // µg/m³
  no2: number;  // µg/m³
  o3: number;   // µg/m³
  so2: number;  // µg/m³
  co: number;   // µg/m³
  fetchedAt: string;
}

export interface AqiLevel {
  level: string;
  color: string;
  bgColor: string;
  textColor: string;
  advisory: string;
  mask: boolean;
}

const CACHE_TTL_MS = 15 * 60 * 1000;

/** Fetch air quality for a location, with DB caching. */
export async function getAirQuality(lat: number, lng: number): Promise<AirQualityData | null> {
  const rLat = Math.round(lat * 1000) / 1000;
  const rLng = Math.round(lng * 1000) / 1000;

  // DB cache lookup
  const cached = await db.weatherCache.findFirst({
    where: { lat: rLat + 0.001, lng: rLng + 0.001, expiresAt: { gt: new Date() } },
    orderBy: { fetchedAt: "desc" },
  });
  if (cached) {
    try {
      const parsed = JSON.parse(cached.data);
      if (parsed.europeanAqi !== undefined) return parsed as AirQualityData;
    } catch {
      // not an AQ cache, fall through
    }
  }

  try {
    const url = `${AQ_API}?latitude=${rLat}&longitude=${rLng}&current=european_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide&timezone=auto`;
    const res = await fetch(url, {
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      current: {
        european_aqi: number;
        pm2_5: number;
        pm10: number;
        nitrogen_dioxide: number;
        ozone: number;
        sulphur_dioxide: number;
        carbon_monoxide: number;
      };
    };
    const c = data.current;
    const aq: AirQualityData = {
      europeanAqi: c.european_aqi,
      pm25: c.pm2_5,
      pm10: c.pm10,
      no2: c.nitrogen_dioxide,
      o3: c.ozone,
      so2: c.sulphur_dioxide,
      co: c.carbon_monoxide,
      fetchedAt: new Date().toISOString(),
    };

    // Cache it (reuse weatherCache table with offset to distinguish from weather).
    await db.weatherCache.create({
      data: {
        lat: rLat + 0.001,
        lng: rLng + 0.001,
        data: JSON.stringify(aq),
        expiresAt: new Date(Date.now() + CACHE_TTL_MS),
      },
    }).catch(() => { /* ignore cache write errors */ });

    return aq;
  } catch {
    // Air quality API may be unreachable in some environments; gracefully
    // return null so the card shows "unavailable" rather than erroring.
    return null;
  }
}

/** Classify the European AQI into a level + advisory. */
export function classifyAqi(europeanAqi: number): AqiLevel {
  if (europeanAqi <= 20) {
    return { level: "Good", color: "#10b981", bgColor: "bg-emerald-100 dark:bg-emerald-950/40", textColor: "text-emerald-700 dark:text-emerald-300", advisory: "Air quality is good. Ride freely.", mask: false };
  }
  if (europeanAqi <= 40) {
    return { level: "Fair", color: "#84cc16", bgColor: "bg-lime-100 dark:bg-lime-950/40", textColor: "text-lime-700 dark:text-lime-300", advisory: "Air quality is fair. No precautions needed.", mask: false };
  }
  if (europeanAqi <= 60) {
    return { level: "Moderate", color: "#f59e0b", bgColor: "bg-amber-100 dark:bg-amber-950/40", textColor: "text-amber-700 dark:text-amber-300", advisory: "Moderate pollution. Consider a mask on long rides.", mask: true };
  }
  if (europeanAqi <= 80) {
    return { level: "Poor", color: "#f97316", bgColor: "bg-orange-100 dark:bg-orange-950/40", textColor: "text-orange-700 dark:text-orange-300", advisory: "Poor air quality. Wear a mask and limit exposure.", mask: true };
  }
  if (europeanAqi <= 100) {
    return { level: "Very Poor", color: "#ef4444", bgColor: "bg-red-100 dark:bg-red-950/40", textColor: "text-red-700 dark:text-red-300", advisory: "Very poor air. Wear an N95 mask. Avoid prolonged outdoor riding.", mask: true };
  }
  return { level: "Extremely Poor", color: "#991b1b", bgColor: "bg-red-200 dark:bg-red-950/60", textColor: "text-red-800 dark:text-red-200", advisory: "Hazardous air. Avoid outdoor riding if possible.", mask: true };
}

/** Get a pollutant's health meaning. */
export function pollutantAdvisory(pm25: number, pm10: number, no2: number): string | null {
  if (pm25 >= 35) return "PM2.5 is high — fine particles penetrate deep into lungs.";
  if (pm10 >= 70) return "PM10 is elevated — may aggravate respiratory conditions.";
  if (no2 >= 40) return "NO₂ is high from traffic — can trigger asthma symptoms.";
  return null;
}
