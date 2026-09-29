import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, rateLimited } from "@/lib/api";
import { rateLimit, getClientIp, clampLat, clampLng } from "@/lib/security";
import { haversineM } from "@/lib/geo";

export const runtime = "nodejs";

/** GET /api/safe-stops?lat=&lng=&radiusM=&type= */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, 2);
  if (!rl.ok) return rateLimited(rl.retryAfterMs);

  const p = req.nextUrl.searchParams;
  const lat = clampLat(p.get("lat"));
  const lng = clampLng(p.get("lng"));
  if (lat === null || lng === null) return fail("Invalid coordinates.");
  const radiusM = Math.min(20000, Math.max(500, Number(p.get("radiusM") ?? 3000) || 3000));
  const type = p.get("type") ?? undefined;

  const dLat = radiusM / 111320;
  const dLng = radiusM / (111320 * Math.cos((Math.abs(lat) * Math.PI) / 180) || 0.01);

  const stops = await db.safeStop.findMany({
    where: {
      lat: { gte: lat - dLat, lte: lat + dLat },
      lng: { gte: lng - dLng, lte: lng + dLng },
      ...(type ? { type } : {}),
    },
    take: 40,
  });

  const withDistance = stops
    .map((s) => ({
      ...s,
      distanceM: Math.round(haversineM({ lat, lng }, { lat: s.lat, lng: s.lng })),
    }))
    .filter((s) => s.distanceM <= radiusM)
    .sort((a, b) => a.distanceM - b.distanceM);

  return ok({ stops: withDistance });
}
