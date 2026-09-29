import { NextRequest } from "next/server";
import { getAirQuality, classifyAqi, pollutantAdvisory } from "@/lib/air-quality-service";
import { ok, fail, rateLimited } from "@/lib/api";
import { rateLimit, getClientIp, clampLat, clampLng } from "@/lib/security";

export const runtime = "nodejs";

/** GET /api/air-quality?lat=&lng= */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, 2);
  if (!rl.ok) return rateLimited(rl.retryAfterMs);

  const p = req.nextUrl.searchParams;
  const lat = clampLat(p.get("lat"));
  const lng = clampLng(p.get("lng"));
  if (lat === null || lng === null) return fail("Invalid coordinates.");

  const aq = await getAirQuality(lat, lng);
  if (!aq) return fail("Air quality service unavailable.", 503);

  const level = classifyAqi(aq.europeanAqi);
  const pollutant = pollutantAdvisory(aq.pm25, aq.pm10, aq.no2);

  return ok({
    ...aq,
    level: level.level,
    color: level.color,
    advisory: level.advisory,
    mask: level.mask,
    pollutantAdvisory: pollutant,
  });
}
