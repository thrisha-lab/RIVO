import { NextRequest } from "next/server";
import { reverseGeocode } from "@/lib/geocode-service";
import { ok, fail, rateLimited } from "@/lib/api";
import { rateLimit, getClientIp, clampLat, clampLng } from "@/lib/security";

export const runtime = "nodejs";

/** GET /api/geocode/reverse?lat=&lng= — readable address for coordinates. */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, 3);
  if (!rl.ok) return rateLimited(rl.retryAfterMs);

  const lat = clampLat(req.nextUrl.searchParams.get("lat"));
  const lng = clampLng(req.nextUrl.searchParams.get("lng"));
  if (lat === null || lng === null) return fail("Invalid coordinates.");

  const address = await reverseGeocode(lat, lng);
  return ok({ address });
}
