import { NextRequest } from "next/server";
import { getHourlyForecast, recommendBestDeparture } from "@/lib/forecast-service";
import { ok, fail, rateLimited } from "@/lib/api";
import { rateLimit, getClientIp, clampLat, clampLng } from "@/lib/security";

export const runtime = "nodejs";

/** GET /api/forecast?lat=&lng=&hours=12 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, 2);
  if (!rl.ok) return rateLimited(rl.retryAfterMs);

  const p = req.nextUrl.searchParams;
  const lat = clampLat(p.get("lat"));
  const lng = clampLng(p.get("lng"));
  if (lat === null || lng === null) return fail("Invalid coordinates.");
  const hours = Math.min(24, Math.max(4, Number(p.get("hours") ?? 12) || 12));

  const forecast = await getHourlyForecast(lat, lng, hours);
  if (forecast.length === 0) return fail("Forecast unavailable.", 503);

  const recommendation = recommendBestDeparture(forecast);
  return ok({ forecast, recommendation });
}
