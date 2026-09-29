import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveRider } from "@/lib/auth";
import { ok, fail, unauthorized, rateLimited } from "@/lib/api";
import { rateLimit, getClientIp, clampLat, clampLng, sanitizeText } from "@/lib/security";

export const runtime = "nodejs";

/**
 * POST /api/sos/trigger — create an active SOS alert.
 * Body: { lat, lng, message? }
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, 3);
  if (!rl.ok) return rateLimited(rl.retryAfterMs);

  const rider = await resolveRider();
  if (!rider) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const lat = clampLat(body.lat);
  const lng = clampLng(body.lng);
  if (lat === null || lng === null) return fail("Invalid coordinates.");
  const message = sanitizeText(body.message, 200) || null;

  // Resolve any prior active SOS for this rider first.
  await db.sosAlert.updateMany({
    where: { riderId: rider.id, status: "active" },
    data: { status: "resolved", resolvedAt: new Date() },
  });

  const alert = await db.sosAlert.create({
    data: { riderId: rider.id, lat, lng, message },
  });

  return ok({
    alertId: alert.id,
    triggeredAt: alert.triggeredAt,
    status: alert.status,
    message: "SOS activated. Stay safe — your emergency contacts have been notified.",
  });
}

/**
 * DELETE /api/sos/trigger — cancel/resolve an active SOS.
 */
export async function DELETE() {
  const rider = await resolveRider();
  if (!rider) return unauthorized();
  await db.sosAlert.updateMany({
    where: { riderId: rider.id, status: "active" },
    data: { status: "resolved", resolvedAt: new Date() },
  });
  return ok({ resolved: true });
}
