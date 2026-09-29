import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveRider } from "@/lib/auth";
import { getWeather, getPrecipProbability } from "@/lib/weather-service";
import { getRoute } from "@/lib/routing-service";
import { assessRisk, SEVERITY_ORDER } from "@/lib/risk-engine";
import { haversineKm } from "@/lib/geo";
import { ok, fail, unauthorized, rateLimited } from "@/lib/api";
import { rateLimit, getClientIp, clampLat, clampLng } from "@/lib/security";

export const runtime = "nodejs";

/**
 * GET /api/risk?originLat=&originLng=&destLat=&destLng=
 * Computes a deterministic risk assessment combining weather, time-of-day,
 * hazard density along the route buffer, and route exposure.
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, 3);
  if (!rl.ok) return rateLimited(rl.retryAfterMs);

  const rider = await resolveRider();
  // Risk can be computed anonymously too, but we persist if rider exists.

  const p = req.nextUrl.searchParams;
  const originLat = clampLat(p.get("originLat"));
  const originLng = clampLng(p.get("originLng"));
  const destLat = clampLat(p.get("destLat"));
  const destLng = clampLng(p.get("destLng"));

  const hasOrigin = originLat !== null && originLng !== null;
  const hasDest = destLat !== null && destLng !== null;

  // Determine evaluation center: midpoint of route, or origin, or dest.
  let centerLat: number | null = null;
  let centerLng: number | null = null;
  if (hasOrigin && hasDest) {
    centerLat = (originLat! + destLat!) / 2;
    centerLng = (originLng! + destLng!) / 2;
  } else if (hasOrigin) {
    centerLat = originLat;
    centerLng = originLng;
  } else if (hasDest) {
    centerLat = destLat;
    centerLng = destLng;
  } else {
    return fail("Provide originLat/originLng and/or destLat/destLng.");
  }

  // Weather at the route center (representative).
  const weather = await getWeather(centerLat!, centerLng!);
  if (weather && hasDest) {
    // Enrich precip probability along the route.
    weather.precipProbability = await getPrecipProbability(centerLat!, centerLng!);
  }

  // Route geometry (if both points present).
  let route: Awaited<ReturnType<typeof getRoute>> = null;
  if (hasOrigin && hasDest) {
    route = await getRoute(
      { lat: originLat!, lng: originLng! },
      { lat: destLat!, lng: destLng! },
    );
  }

  // Hazard density: count active hazards within ~500m of route geometry.
  // Cheap approach: sample the polyline and query DB by bbox.
  let activeCount = 0;
  let severeCount = 0;
  const samplePoints = route && route.geometry.length > 1 ? route.geometry : [{ lat: centerLat!, lng: centerLng! }];
  const seen = new Set<string>();
  for (const sp of samplePoints) {
    const dLat = 0.0045; // ~500m
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
    route: route ? { distanceKm: route.distanceKm, durationMin: route.durationMin } : null,
  });

  // Persist assessment if rider is identified.
  let sessionId: string | null = null;
  if (rider) {
    const session = await db.trackingSession.findFirst({
      where: { riderId: rider.id, status: "active" },
      orderBy: { startedAt: "desc" },
    });
    sessionId = session?.id ?? null;
    await db.riskAssessment.create({
      data: {
        riderId: rider.id,
        sessionId: sessionId ?? undefined,
        score: risk.score,
        level: risk.level,
        factors: JSON.stringify(risk.factors),
        originLat: hasOrigin ? originLat! : undefined,
        originLng: hasOrigin ? originLng! : undefined,
        destLat: hasDest ? destLat! : undefined,
        destLng: hasDest ? destLng! : undefined,
        weatherSummary: weather
          ? `${weather.tempC.toFixed(0)}C wind ${Math.round(weather.windSpeedKph)} gust ${Math.round(weather.windGustKph)} precip ${weather.precipMm.toFixed(1)}mm`
          : null,
      },
    });
  }

  const distanceKm = route ? route.distanceKm : hasOrigin && hasDest ? haversineKm({ lat: originLat!, lng: originLng! }, { lat: destLat!, lng: destLng! }) : null;

  return ok({
    score: risk.score,
    level: risk.level,
    factors: risk.factors,
    recommendation: risk.recommendation,
    weather: weather
      ? {
          tempC: weather.tempC,
          apparentTempC: weather.apparentTempC,
          windSpeedKph: weather.windSpeedKph,
          windGustKph: weather.windGustKph,
          precipMm: weather.precipMm,
          precipProbability: weather.precipProbability,
          visibilityM: weather.visibilityM,
          isDay: weather.isDay,
          cloudCover: weather.cloudCover,
          humidity: weather.humidity,
        }
      : null,
    route: route
      ? { distanceKm: route.distanceKm, durationMin: route.durationMin, geometry: route.geometry, source: route.source }
      : distanceKm !== null
        ? { distanceKm, durationMin: null, geometry: null, source: "straight-line" }
        : null,
    hazards: { activeCount, severeCount },
    rider: rider
      ? { id: rider.id, displayName: rider.displayName, reputation: rider.reputation }
      : null,
  });
}
