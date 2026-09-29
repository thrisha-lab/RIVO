/**
 * Achievement badges system.
 *
 * Badges are earned deterministically based on rider activity. The logic is
 * server-side and triggered after relevant actions (report, vote, sos, etc.).
 */
import { db } from "@/lib/db";

export interface BadgeDef {
  code: string;
  label: string;
  description: string;
  emoji: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
}

export const BADGES: BadgeDef[] = [
  { code: "first_report", label: "First Report", description: "Filed your first hazard report", emoji: "📝", tier: "bronze" },
  { code: "streak_7", label: "7-Day Streak", description: "Active on 7 consecutive days", emoji: "🔥", tier: "silver" },
  { code: "verified_reporter", label: "Verified Reporter", description: "Got a report verified by the community", emoji: "✅", tier: "silver" },
  { code: "hazard_explorer", label: "Hazard Explorer", description: "Reported 10 hazards", emoji: "🗺️", tier: "gold" },
  { code: "weather_watcher", label: "Weather Watcher", description: "Ran 20 risk assessments", emoji: "🌤️", tier: "gold" },
  { code: "sos_guardian", label: "SOS Guardian", description: "Responded to a nearby SOS", emoji: "🛡️", tier: "platinum" },
  { code: "top_contributor", label: "Top Contributor", description: "Reached the top 3 on the leaderboard", emoji: "🏆", tier: "platinum" },
  { code: "community_voice", label: "Community Voice", description: "Cast 25 hazard votes", emoji: "🗳️", tier: "gold" },
];

export const BADGE_CODES = BADGES.map((b) => b.code);

/** Award a badge to a rider if not already earned. Returns true if newly awarded. */
export async function awardBadge(riderId: string, code: string): Promise<boolean> {
  if (!BADGE_CODES.includes(code)) return false;
  try {
    await db.achievement.upsert({
      where: { riderId_code: { riderId, code } },
      update: {},
      create: { riderId, code },
    });
    return true;
  } catch {
    return false;
  }
}

/** Evaluate which badges a rider qualifies for based on current stats. */
export async function evaluateBadges(riderId: string): Promise<string[]> {
  const rider = await db.rider.findUnique({
    where: { id: riderId },
    select: { reportsCount: true, votesCount: true, reputation: true, createdAt: true, lastSeenAt: true },
  });
  if (!rider) return [];

  const earned: string[] = [];

  if (rider.reportsCount >= 1) earned.push("first_report");
  if (rider.reportsCount >= 10) earned.push("hazard_explorer");
  if (rider.votesCount >= 25) earned.push("community_voice");

  // verified_reporter: has any verified report
  const verified = await db.hazardReport.count({ where: { reporterId: riderId, verified: true } });
  if (verified >= 1) earned.push("verified_reporter");

  // weather_watcher: 20 risk assessments
  const riskCount = await db.riskAssessment.count({ where: { riderId } });
  if (riskCount >= 20) earned.push("weather_watcher");

  // streak_7: 7 distinct active days
  const sessions = await db.trackingSession.findMany({
    where: { riderId, startedAt: { gte: new Date(Date.now() - 14 * 86400000) } },
    select: { startedAt: true },
    take: 200,
  });
  const days = new Set(sessions.map((s) => s.startedAt.toDateString()));
  if (days.size >= 7) earned.push("streak_7");

  // top_contributor: top 3 by reputation
  const top3 = await db.rider.findMany({
    orderBy: [{ reputation: "desc" }],
    take: 3,
    select: { id: true },
  });
  if (top3.some((r) => r.id === riderId)) earned.push("top_contributor");

  return earned;
}

/** Sync earned badges for a rider (award any missing, return all earned). */
export async function syncBadges(riderId: string): Promise<string[]> {
  const earned = await evaluateBadges(riderId);
  for (const code of earned) {
    await awardBadge(riderId, code);
  }
  return earned;
}
