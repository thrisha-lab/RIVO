import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveRider } from "@/lib/auth";
import { ok, fail, unauthorized, rateLimited } from "@/lib/api";
import { getClientIp, rateLimit } from "@/lib/security";

export const runtime = "nodejs";

/** GET /api/hazards/[id] — full hazard detail with vote history + reporter info. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, 2);
  if (!rl.ok) return rateLimited(rl.retryAfterMs);

  const rider = await resolveRider();
  if (!rider) return unauthorized();

  const { id } = await ctx.params;
  const hazard = await db.hazardReport.findUnique({
    where: { id },
    include: {
      reporter: { select: { displayName: true, reputation: true } },
      votes: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, vote: true, createdAt: true, riderId: true, rider: { select: { displayName: true } } },
      },
    },
  });
  if (!hazard) return fail("Hazard not found.", 404);

  // Time since report
  const ageMin = Math.round((Date.now() - hazard.createdAt.getTime()) / 60000);

  // Confidence: ratio of confirms to total votes
  const totalVotes = hazard.confirmCount + hazard.disputeCount;
  const confidence = totalVotes > 0 ? Math.round((hazard.confirmCount / totalVotes) * 100) : 0;

  return ok({
    id: hazard.id,
    type: hazard.type,
    severity: hazard.severity,
    lat: hazard.lat,
    lng: hazard.lng,
    description: hazard.description,
    addressLabel: hazard.addressLabel,
    imageUrl: hazard.imageUrl,
    confirmCount: hazard.confirmCount,
    disputeCount: hazard.disputeCount,
    status: hazard.status,
    verified: hazard.verified,
    createdAt: hazard.createdAt.toISOString(),
    ageMin,
    confidence,
    totalVotes,
    reporter: hazard.reporter,
    votes: hazard.votes.map((v) => ({
      id: v.id,
      vote: v.vote,
      createdAt: v.createdAt.toISOString(),
      displayName: v.rider.displayName,
    })),
    myVote: hazard.votes.find((v) => v.riderId === rider.id)?.vote ?? null,
  });
}
