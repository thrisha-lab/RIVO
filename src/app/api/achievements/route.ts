import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveRider } from "@/lib/auth";
import { ok, fail, unauthorized, rateLimited } from "@/lib/api";
import { getClientIp, rateLimit } from "@/lib/security";
import { syncBadges, BADGES } from "@/lib/achievements";

export const runtime = "nodejs";

/** GET /api/achievements — rider's earned badges + all available badges. */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, 2);
  if (!rl.ok) return rateLimited(rl.retryAfterMs);

  const rider = await resolveRider();
  if (!rider) return unauthorized();

  // Sync (award any newly-qualified badges).
  const earnedCodes = await syncBadges(rider.id);
  const earnedSet = new Set(earnedCodes);
  const earnedRows = await db.achievement.findMany({
    where: { riderId: rider.id },
    select: { code: true, earnedAt: true },
  });
  const earnedAt: Record<string, string> = {};
  for (const r of earnedRows) earnedAt[r.code] = r.earnedAt.toISOString();

  const badges = BADGES.map((b) => ({
    ...b,
    earned: earnedSet.has(b.code),
    earnedAt: earnedAt[b.code] ?? null,
  }));

  return ok({
    badges,
    earnedCount: earnedCodes.length,
    totalCount: BADGES.length,
  });
}
