import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveRider } from "@/lib/auth";
import { ok, fail, unauthorized, rateLimited } from "@/lib/api";
import { rateLimit, getClientIp } from "@/lib/security";

export const runtime = "nodejs";

/**
 * POST /api/hazards/[id]/vote
 * Body: { vote: "confirm" | "dispute" }
 * Toggle: voting again with the same value removes the vote; with a different
 * value flips it. Counts kept in sync.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, 3);
  if (!rl.ok) return rateLimited(rl.retryAfterMs);

  const rider = await resolveRider();
  if (!rider) return unauthorized();

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const vote = body.vote === "confirm" || body.vote === "dispute" ? body.vote : null;
  if (!vote) return fail("vote must be 'confirm' or 'dispute'.");

  const hazard = await db.hazardReport.findUnique({ where: { id } });
  if (!hazard) return fail("Hazard not found.", 404);
  if (hazard.status === "expired") return fail("Hazard expired.", 410);

  // transaction: upsert vote + adjust counts + resolve/dispute state.
  const result = await db.$transaction(async (tx) => {
    const existing = await tx.hazardVote.findUnique({
      where: { hazardId_riderId: { hazardId: id, riderId: rider.id } },
    });
    if (existing && existing.vote === vote) {
      // remove vote (toggle off)
      await tx.hazardVote.delete({ where: { id: existing.id } });
      if (vote === "confirm") {
        await tx.hazardReport.update({ where: { id }, data: { confirmCount: { decrement: 1 } } });
      } else {
        await tx.hazardReport.update({ where: { id }, data: { disputeCount: { decrement: 1 } } });
      }
      return { action: "removed" as const };
    }
    if (existing && existing.vote !== vote) {
      await tx.hazardVote.update({ where: { id: existing.id }, data: { vote } });
      if (vote === "confirm") {
        await tx.hazardReport.update({
          where: { id },
          data: { confirmCount: { increment: 1 }, disputeCount: { decrement: 1 } },
        });
      } else {
        await tx.hazardReport.update({
          where: { id },
          data: { disputeCount: { increment: 1 }, confirmCount: { decrement: 1 } },
        });
      }
    } else {
      await tx.hazardVote.create({ data: { hazardId: id, riderId: rider.id, vote } });
      if (vote === "confirm") {
        await tx.hazardReport.update({ where: { id }, data: { confirmCount: { increment: 1 } } });
      } else {
        await tx.hazardReport.update({ where: { id }, data: { disputeCount: { increment: 1 } } });
      }
    }

    const updated = await tx.hazardReport.findUnique({ where: { id } });
    let newStatus = updated?.status ?? "active";
    if (updated) {
      // Auto-resolve if disputed heavily.
      if (updated.disputeCount >= 3 && updated.disputeCount > updated.confirmCount * 2) {
        newStatus = "resolved";
      } else if (updated.confirmCount >= 2) {
        newStatus = "active";
        // verified when community consensus reached
        if (updated.confirmCount >= 3 && !updated.verified) {
          await tx.hazardReport.update({ where: { id }, data: { verified: true } });
        }
      } else if (updated.disputeCount >= 1 && updated.confirmCount === 0) {
        newStatus = "disputed";
      }
      if (newStatus !== updated.status) {
        await tx.hazardReport.update({ where: { id }, data: { status: newStatus } });
      }
    }

    await tx.rider.update({
      where: { id: rider.id },
      data: { reputation: { increment: 1 }, votesCount: { increment: 1 } },
    });

    return { action: "recorded" as const, status: newStatus };
  });

  return ok(result);
}
