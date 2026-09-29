import { NextRequest } from "next/server";
import { getRoute } from "@/lib/routing-service";
import { ok, fail, rateLimited } from "@/lib/api";
import { rateLimit, getClientIp, clampLat, clampLng } from "@/lib/security";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, 3);
  if (!rl.ok) return rateLimited(rl.retryAfterMs);

  const p = req.nextUrl.searchParams;
  const originLat = clampLat(p.get("originLat"));
  const originLng = clampLng(p.get("originLng"));
  const destLat = clampLat(p.get("destLat"));
  const destLng = clampLng(p.get("destLng"));
  if (originLat === null || originLng === null || destLat === null || destLng === null)
    return fail("Invalid coordinates.");

  const route = await getRoute(
    { lat: originLat, lng: originLng },
    { lat: destLat, lng: destLng },
  );
  if (!route) return fail("Routing service unavailable.", 503);

  return ok({
    distanceKm: route.distanceKm,
    durationMin: route.durationMin,
    geometry: route.geometry,
    source: route.source,
  });
}
