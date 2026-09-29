import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, rateLimited } from "@/lib/api";
import { rateLimit, getClientIp, clampLat, clampLng } from "@/lib/security";
import { haversineM } from "@/lib/geo";

export const runtime = "nodejs";

/**
 * GET /api/feed?lat=&lng=&radiusM=
 * Location-based community feed: recent hazards + recently verified stops.
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, 2);
  if (!rl.ok) return rateLimited(rl.retryAfterMs);

  const p = req.nextUrl.searchParams;
  const lat = clampLat(p.get("lat"));
  const lng = clampLng(p.get("lng"));
  if (lat === null || lng === null) return fail("Invalid coordinates.");
  const radiusM = Math.min(20000, Math.max(500, Number(p.get("radiusM") ?? 5000) || 5000));

  const dLat = radiusM / 111320;
  const dLng = radiusM / (111320 * Math.cos((Math.abs(lat) * Math.PI) / 180) || 0.01);

  const hazards = await db.hazardReport.findMany({
    where: {
      lat: { gte: lat - dLat, lte: lat + dLat },
      lng: { gte: lng - dLng, lte: lng + dLng },
      status: { in: ["active", "disputed"] },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      type: true,
      severity: true,
      lat: true,
      lng: true,
      description: true,
      confirmCount: true,
      disputeCount: true,
      status: true,
      verified: true,
      createdAt: true,
      reporter: { select: { displayName: true } },
    },
  });

  const stops = await db.safeStop.findMany({
    where: {
      lat: { gte: lat - dLat, lte: lat + dLat },
      lng: { gte: lng - dLng, lte: lng + dLng },
    },
    take: 10,
  });

  const items = [
    ...hazards.map((h) => ({
      kind: "hazard" as const,
      ...h,
      distanceM: Math.round(haversineM({ lat, lng }, { lat: h.lat, lng: h.lng })),
    })),
    ...stops.map((s) => ({
      kind: "safe-stop" as const,
      ...s,
      distanceM: Math.round(haversineM({ lat, lng }, { lat: s.lat, lng: s.lng })),
    })),
  ].sort((a, b) => a.distanceM - b.distanceM);

  return ok({ feed: items.filter((i) => i.distanceM <= radiusM) });
}
