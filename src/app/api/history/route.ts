import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveRider } from "@/lib/auth";
import { ok, fail, unauthorized, rateLimited } from "@/lib/api";
import { rateLimit, getClientIp } from "@/lib/security";

export const runtime = "nodejs";

/** GET /api/history — past risk assessments for the rider. */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, 2);
  if (!rl.ok) return rateLimited(rl.retryAfterMs);

  const rider = await resolveRider();
  if (!rider) return unauthorized();

  const limit = Math.min(50, Math.max(5, Number(req.nextUrl.searchParams.get("limit") ?? 20) || 20));

  const records = await db.riskAssessment.findMany({
    where: { riderId: rider.id },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      score: true,
      level: true,
      factors: true,
      originLat: true,
      originLng: true,
      destLat: true,
      destLng: true,
      weatherSummary: true,
      createdAt: true,
    },
  });

  const parsed = records.map((r) => {
    let factors: unknown = [];
    try {
      factors = JSON.parse(r.factors);
    } catch {
      factors = [];
    }
    return { ...r, factors };
  });

  // Aggregate stats
  const stats =
    parsed.length > 0
      ? {
          totalTrips: parsed.length,
          avgScore: Math.round(parsed.reduce((s, r) => s + r.score, 0) / parsed.length),
          worstScore: Math.max(...parsed.map((r) => r.score)),
          bestScore: Math.min(...parsed.map((r) => r.score)),
          levelCounts: parsed.reduce<Record<string, number>>((acc, r) => {
            acc[r.level] = (acc[r.level] ?? 0) + 1;
            return acc;
          }, {}),
        }
      : null;

  return ok({ history: parsed, stats });
}
