import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveRider } from "@/lib/auth";
import { ok, fail, unauthorized, rateLimited } from "@/lib/api";
import { rateLimit, getClientIp, clampLat, clampLng, sanitizeText } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, 2);
  if (!rl.ok) return rateLimited(rl.retryAfterMs);

  const rider = await resolveRider();
  if (!rider) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const lat = clampLat(body.lat);
  const lng = clampLng(body.lng);
  const label = sanitizeText(body.label, 120);
  const source = ["search", "map-pin", "recent"].includes(body.source) ? body.source : "search";
  if (lat === null || lng === null || !label) return fail("Invalid destination.");

  const dest = await db.destination.create({
    data: { riderId: rider.id, label, lat, lng, source },
  });
  return ok({ id: dest.id, label, lat, lng });
}

/** Recent destinations for the rider. */
export async function GET() {
  const rider = await resolveRider();
  if (!rider) return unauthorized();
  const recent = await db.destination.findMany({
    where: { riderId: rider.id },
    orderBy: { createdAt: "desc" },
    take: 8,
  });
  return ok({ recent });
}
