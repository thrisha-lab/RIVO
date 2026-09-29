import { NextRequest } from "next/server";
import { getWeather } from "@/lib/weather-service";
import { describeWeatherCode } from "@/lib/weather-service";
import { ok, fail, rateLimited } from "@/lib/api";
import { rateLimit, getClientIp, clampLat, clampLng } from "@/lib/security";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, 2);
  if (!rl.ok) return rateLimited(rl.retryAfterMs);

  const lat = clampLat(req.nextUrl.searchParams.get("lat"));
  const lng = clampLng(req.nextUrl.searchParams.get("lng"));
  if (lat === null || lng === null) return fail("Invalid coordinates.");

  const weather = await getWeather(lat, lng);
  if (!weather) return fail("Weather service unavailable.", 503);

  return ok({
    weather,
    description: describeWeatherCode(weather.weatherCode),
  });
}
