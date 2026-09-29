import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveRider } from "@/lib/auth";
import { ok, fail, unauthorized, rateLimited } from "@/lib/api";
import { rateLimit, getClientIp, sanitizeText } from "@/lib/security";

export const runtime = "nodejs";

/** GET /api/settings — rider profile settings. */
export async function GET() {
  const rider = await resolveRider();
  if (!rider) return unauthorized();
  const full = await db.rider.findUnique({
    where: { id: rider.id },
    select: { id: true, displayName: true, region: true, reputation: true, createdAt: true, lastSeenAt: true },
  });
  return ok(full);
}

/** PUT /api/settings — update display name + region. */
export async function PUT(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, 3);
  if (!rl.ok) return rateLimited(rl.retryAfterMs);

  const rider = await resolveRider();
  if (!rider) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const updates: { displayName?: string; region?: string | null } = {};

  if (typeof body.displayName === "string") {
    const name = sanitizeText(body.displayName, 30);
    if (name.length < 3) return fail("Display name must be at least 3 characters.");
    if (!/^Rider-[A-Z0-9]+$/.test(name) && name.length > 0) {
      // allow custom names but keep "Rider-XXXX" format optional
    }
    updates.displayName = name;
  }
  if (body.region !== undefined) {
    if (body.region === null) {
      updates.region = null;
    } else {
      updates.region = sanitizeText(body.region, 50) || null;
    }
  }

  if (Object.keys(updates).length === 0) return fail("Nothing to update.");
  const updated = await db.rider.update({
    where: { id: rider.id },
    data: updates,
    select: { id: true, displayName: true, region: true, reputation: true },
  });
  return ok(updated);
}

/** DELETE /api/settings — delete the rider account + all associated data. */
export async function DELETE() {
  const rider = await resolveRider();
  if (!rider) return unauthorized();

  // Cascade delete handles all relations per schema.
  await db.rider.delete({ where: { id: rider.id } });

  // Clear the auth cookie.
  const res = NextResponse.json({ ok: true, data: { deleted: true } });
  res.cookies.set("rg_rider_token", "", { maxAge: 0, path: "/" });
  return res;
}
