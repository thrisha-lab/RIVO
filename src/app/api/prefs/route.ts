import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveRider } from "@/lib/auth";
import { ok, unauthorized, rateLimited } from "@/lib/api";
import { rateLimit, getClientIp } from "@/lib/security";

export const runtime = "nodejs";

/** GET /api/prefs — rider's notification preferences (creates defaults if missing). */
export async function GET() {
  const rider = await resolveRider();
  if (!rider) return unauthorized();
  let prefs = await db.notificationPref.findUnique({ where: { riderId: rider.id } });
  if (!prefs) {
    prefs = await db.notificationPref.create({ data: { riderId: rider.id } });
  }
  return ok(prefs);
}

/** PUT /api/prefs — update notification preferences. */
export async function PUT(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, 5);
  if (!rl.ok) return rateLimited(rl.retryAfterMs);

  const rider = await resolveRider();
  if (!rider) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const data = {
    severeWeather: typeof body.severeWeather === "boolean" ? body.severeWeather : undefined,
    newHazardNearby: typeof body.newHazardNearby === "boolean" ? body.newHazardNearby : undefined,
    riskEscalation: typeof body.riskEscalation === "boolean" ? body.riskEscalation : undefined,
    communityUpdates: typeof body.communityUpdates === "boolean" ? body.communityUpdates : undefined,
  };
  // strip undefined
  const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));

  const prefs = await db.notificationPref.upsert({
    where: { riderId: rider.id },
    update: clean,
    create: { riderId: rider.id, ...clean },
  });
  return ok(prefs);
}
