import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveRider } from "@/lib/auth";
import { ok, fail, unauthorized, rateLimited } from "@/lib/api";
import { rateLimit, getClientIp, clampLat, clampLng } from "@/lib/security";

export const runtime = "nodejs";

/** Start a new tracking session. */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, 5);
  if (!rl.ok) return rateLimited(rl.retryAfterMs);

  const rider = await resolveRider();
  if (!rider) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const originLat = clampLat(body.originLat);
  const originLng = clampLng(body.originLng);
  const destLat = clampLat(body.destLat);
  const destLng = clampLng(body.destLng);
  const destLabel = typeof body.destLabel === "string" ? body.destLabel.slice(0, 120) : undefined;

  // close any existing active session for the rider to avoid duplicates
  await db.trackingSession.updateMany({
    where: { riderId: rider.id, status: "active" },
    data: { status: "cancelled", endedAt: new Date() },
  });

  const session = await db.trackingSession.create({
    data: {
      riderId: rider.id,
      status: "active",
      originLat: originLat ?? undefined,
      originLng: originLng ?? undefined,
      destLat: destLat ?? undefined,
      destLng: destLng ?? undefined,
      destLabel,
    },
  });
  return ok({ sessionId: session.id, status: session.status });
}

/** Append a GPS point to the active session. */
export async function PUT(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, 1);
  if (!rl.ok) return rateLimited(rl.retryAfterMs);

  const rider = await resolveRider();
  if (!rider) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const lat = clampLat(body.lat);
  const lng = clampLng(body.lng);
  if (lat === null || lng === null) return fail("Invalid coordinates.");

  const session = await db.trackingSession.findFirst({
    where: { riderId: rider.id, status: "active" },
    orderBy: { startedAt: "desc" },
  });
  if (!session) return fail("No active tracking session.", 404);

  const accuracy = typeof body.accuracy === "number" ? body.accuracy : null;
  const speed = typeof body.speed === "number" ? body.speed : null;
  const heading = typeof body.heading === "number" ? body.heading : null;

  const point = await db.gpsPoint.create({
    data: {
      sessionId: session.id,
      riderId: rider.id,
      lat,
      lng,
      accuracy: accuracy,
      speed: speed,
      heading: heading,
    },
  });
  return ok({ pointId: point.id, recordedAt: point.recordedAt });
}

/** End the active session. */
export async function DELETE() {
  const rider = await resolveRider();
  if (!rider) return unauthorized();
  await db.trackingSession.updateMany({
    where: { riderId: rider.id, status: "active" },
    data: { status: "completed", endedAt: new Date() },
  });
  return ok({ ended: true });
}
