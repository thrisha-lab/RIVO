import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveRider } from "@/lib/auth";
import { ok, unauthorized, fail, rateLimited } from "@/lib/api";
import { getClientIp, rateLimit } from "@/lib/security";

export const runtime = "nodejs";

/** GET /api/sos/active — the rider's current active SOS (if any). */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, 2);
  if (!rl.ok) return rateLimited(rl.retryAfterMs);

  const rider = await resolveRider();
  if (!rider) return unauthorized();

  const active = await db.sosAlert.findFirst({
    where: { riderId: rider.id, status: "active" },
    orderBy: { triggeredAt: "desc" },
  });
  return ok({ active });
}
