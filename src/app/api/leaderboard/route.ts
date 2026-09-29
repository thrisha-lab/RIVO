import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, rateLimited } from "@/lib/api";
import { rateLimit, getClientIp } from "@/lib/security";

export const runtime = "nodejs";

/** GET /api/leaderboard — top riders by reputation (community safety contributors). */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, 2);
  if (!rl.ok) return rateLimited(rl.retryAfterMs);

  const limit = Math.min(50, Math.max(5, Number(req.nextUrl.searchParams.get("limit") ?? 10) || 10));

  const top = await db.rider.findMany({
    orderBy: [{ reputation: "desc" }, { reportsCount: "desc" }],
    take: limit,
    select: {
      id: true,
      displayName: true,
      reputation: true,
      reportsCount: true,
      votesCount: true,
      lastSeenAt: true,
    },
  });

  const ranked = top.map((r, i) => ({
    rank: i + 1,
    ...r,
    isYou: false, // client will mark its own id
  }));

  return ok({ leaderboard: ranked });
}
