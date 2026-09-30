import { NextRequest } from "next/server";
import { getDaylight } from "@/lib/daylight-service";
import { ok, fail, rateLimited } from "@/lib/api";
import { rateLimit, getClientIp, clampLat, clampLng } from "@/lib/security";

export const runtime = "nodejs";

/** GET /api/daylight?lat=&lng= */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, 2);
  if (!rl.ok) return rateLimited(rl.retryAfterMs);

  const p = req.nextUrl.searchParams;
  const lat = clampLat(p.get("lat"));
  const lng = clampLng(p.get("lng"));
  if (lat === null || lng === null) return fail("Invalid coordinates.");

  const daylight = await getDaylight(lat, lng);
  if (!daylight) return fail("Daylight service unavailable.", 503);

  return ok(daylight);
}
