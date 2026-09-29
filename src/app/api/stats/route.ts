import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveRider } from "@/lib/auth";
import { ok, unauthorized, rateLimited } from "@/lib/api";
import { getClientIp, rateLimit } from "@/lib/security";
import { haversineKm } from "@/lib/geo";

export const runtime = "nodejs";

/**
 * GET /api/stats — rider weekly stats: trips, distance, reports, votes,
 * streak, avg risk, level distribution.
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, 2);
  if (!rl.ok) return rateLimited(rl.retryAfterMs);

  const rider = await resolveRider();
  if (!rider) return unauthorized();

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);

  // Weekly risk assessments (trips)
  const weeklyRisks = await db.riskAssessment.findMany({
    where: { riderId: rider.id, createdAt: { gte: weekAgo } },
    orderBy: { createdAt: "asc" },
    select: { score: true, level: true, createdAt: true, originLat: true, originLng: true, destLat: true, destLng: true },
  });

  // Weekly distance: sum haversine for each trip with origin+dest
  let weeklyDistanceKm = 0;
  for (const r of weeklyRisks) {
    if (r.originLat != null && r.originLng != null && r.destLat != null && r.destLng != null) {
      weeklyDistanceKm += haversineKm(
        { lat: r.originLat, lng: r.originLng },
        { lat: r.destLat, lng: r.destLng },
      );
    }
  }

  // Weekly reports + votes
  const weeklyReports = await db.hazardReport.count({
    where: { reporterId: rider.id, createdAt: { gte: weekAgo } },
  });
  const weeklyVotes = await db.hazardVote.count({
    where: { riderId: rider.id, createdAt: { gte: weekAgo } },
  });

  // Streak: distinct days with activity in the last 14 days
  const sessions = await db.trackingSession.findMany({
    where: { riderId: rider.id, startedAt: { gte: new Date(Date.now() - 14 * 86400000) } },
    select: { startedAt: true },
  });
  const activeDays = new Set(sessions.map((s) => s.startedAt.toDateString()));

  // Current streak: count back from today
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (activeDays.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // All-time counts
  const allTimeTrips = await db.riskAssessment.count({ where: { riderId: rider.id } });
  const allTimeReports = await db.hazardReport.count({ where: { reporterId: rider.id } });

  // Risk level distribution (weekly)
  const levelCounts: Record<string, number> = { low: 0, moderate: 0, high: 0, severe: 0 };
  let totalScore = 0;
  for (const r of weeklyRisks) {
    levelCounts[r.level] = (levelCounts[r.level] ?? 0) + 1;
    totalScore += r.score;
  }
  const avgScore = weeklyRisks.length > 0 ? Math.round(totalScore / weeklyRisks.length) : 0;

  // Daily breakdown for the last 7 days (for a mini chart)
  const daily: { date: string; trips: number; avgScore: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(now);
    day.setDate(now.getDate() - i);
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayStart.getDate() + 1);
    const dayRisks = weeklyRisks.filter((r) => r.createdAt >= dayStart && r.createdAt < dayEnd);
    daily.push({
      date: dayStart.toISOString().slice(0, 10),
      trips: dayRisks.length,
      avgScore: dayRisks.length > 0 ? Math.round(dayRisks.reduce((s, r) => s + r.score, 0) / dayRisks.length) : 0,
    });
  }

  return ok({
    weekly: {
      trips: weeklyRisks.length,
      distanceKm: Math.round(weeklyDistanceKm * 10) / 10,
      reports: weeklyReports,
      votes: weeklyVotes,
      avgScore,
      levelCounts,
    },
    streak,
    activeDays: activeDays.size,
    allTime: { trips: allTimeTrips, reports: allTimeReports, votes: rider.reputation },
    daily,
  });
}
