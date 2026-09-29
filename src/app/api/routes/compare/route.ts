import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getRouteAlternatives } from "@/lib/routing-service";
import { getWeather } from "@/lib/weather-service";
import { assessRisk, SEVERITY_ORDER } from "@/lib/risk-engine";
import { haversineM } from "@/lib/geo";
import { ok, fail, rateLimited } from "@/lib/api";
import { rateLimit, getClientIp, clampLat, clampLng } from "@/lib/security";

export const runtime = "nodejs";

export interface RouteOption {
  index: number;
  distanceKm: number;
  durationMin: number;
  geometry: { lat: number; lng: number }[];
  source: string;
  hazardCount: number;
  severeCount: number;
  riskScore: number;
  riskLevel: string;
  label: "fastest" | "shortest" | "safest" | "alternative";
  recommended: boolean;
}

/**
 * GET /api/routes/compare?originLat=&originLng=&destLat=&destLng=
 * Returns up to 3 alternative routes, each with a risk score computed by
 * sampling hazards along its geometry. The "safest" is the one with the
 * lowest risk; "fastest" is the shortest duration.
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, 2);
  if (!rl.ok) return rateLimited(rl.retryAfterMs);

  const p = req.nextUrl.searchParams;
  const originLat = clampLat(p.get("originLat"));
  const originLng = clampLng(p.get("originLng"));
  const destLat = clampLat(p.get("destLat"));
  const destLng = clampLng(p.get("destLng"));
  if (originLat === null || originLng === null || destLat === null || destLng === null)
    return fail("Invalid coordinates.");

  const routes = await getRouteAlternatives(
    { lat: originLat, lng: originLng },
    { lat: destLat, lng: destLng },
    3,
  );

  // Weather at midpoint for all options (shared).
  const midLat = (originLat + destLat) / 2;
  const midLng = (originLng + destLng) / 2;
  const weather = await getWeather(midLat, midLng);

  // Compute hazard density per route.
  const options: RouteOption[] = [];
  for (let i = 0; i < routes.length; i++) {
    const route = routes[i];
    let activeCount = 0;
    let severeCount = 0;
    const seen = new Set<string>();
    const samplePoints = route.geometry.length > 6
      ? pickSampleIndices(route.geometry.length, 6)
      : route.geometry.map((_, idx) => idx);
    for (const idx of samplePoints) {
      const sp = route.geometry[idx];
      const dLat = 0.0045;
      const dLng = 0.0045 / Math.cos((Math.abs(sp.lat) * Math.PI) / 180 || 0.01);
      const hazards = await db.hazardReport.findMany({
        where: {
          status: { in: ["active", "disputed"] },
          lat: { gte: sp.lat - dLat, lte: sp.lat + dLat },
          lng: { gte: sp.lng - dLng, lte: sp.lng + dLng },
        },
        select: { id: true, severity: true },
      });
      for (const h of hazards) {
        if (seen.has(h.id)) continue;
        seen.add(h.id);
        activeCount++;
        if (SEVERITY_ORDER[h.severity] >= 3) severeCount++;
      }
    }

    const risk = assessRisk({
      weather,
      hazards: { activeCount, severeCount },
      route: { distanceKm: route.distanceKm, durationMin: route.durationMin },
    });

    options.push({
      index: i,
      distanceKm: route.distanceKm,
      durationMin: route.durationMin,
      geometry: route.geometry,
      source: route.source,
      hazardCount: activeCount,
      severeCount,
      riskScore: risk.score,
      riskLevel: risk.level,
      label: "alternative",
      recommended: false,
    });
  }

  // Label: fastest (min duration), shortest (min distance), safest (min risk).
  if (options.length > 0) {
    const fastest = [...options].sort((a, b) => a.durationMin - b.durationMin)[0];
    const shortest = [...options].sort((a, b) => a.distanceKm - b.distanceKm)[0];
    const safest = [...options].sort((a, b) => a.riskScore - b.riskScore)[0];
    fastest.label = "fastest";
    shortest.label = shortest === fastest ? "fastest" : "shortest";
    safest.label = safest === fastest ? "fastest" : safest === shortest ? "shortest" : "safest";
    // Recommend the safest (deterministic engine is source of truth).
    safest.recommended = true;
  }

  return ok({ options, weather: weather ? { tempC: weather.tempC, precipMm: weather.precipMm, windGustKph: weather.windGustKph } : null });
}

function pickSampleIndices(len: number, n: number): number[] {
  if (len <= 0) return [];
  if (len <= n) return Array.from({ length: len }, (_, i) => i);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    out.push(Math.round((i * (len - 1)) / (n - 1)));
  }
  return out;
}
