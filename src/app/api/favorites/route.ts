import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveRider } from "@/lib/auth";
import { ok, fail, unauthorized, rateLimited } from "@/lib/api";
import { rateLimit, getClientIp, clampLat, clampLng, sanitizeText } from "@/lib/security";

export const runtime = "nodejs";

const EMOJIS = ["📍", "🏠", "🏢", "🏪", "🍔", "☕", "⛽", "🏥", "🏫", "🛒"];

/** GET /api/favorites — list saved destinations. */
export async function GET() {
  const rider = await resolveRider();
  if (!rider) return unauthorized();
  const favorites = await db.favoriteDestination.findMany({
    where: { riderId: rider.id },
    orderBy: { lastUsedAt: "desc" },
    take: 20,
  });
  return ok({ favorites });
}

/** POST /api/favorites — save a destination. */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, 5);
  if (!rl.ok) return rateLimited(rl.retryAfterMs);

  const rider = await resolveRider();
  if (!rider) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const label = sanitizeText(body.label, 80);
  const lat = clampLat(body.lat);
  const lng = clampLng(body.lng);
  if (!label || lat === null || lng === null) return fail("label, lat, lng required.");
  const emoji = EMOJIS.includes(body.emoji) ? body.emoji : "📍";

  // upsert by unique [riderId, label, lat, lng]
  const fav = await db.favoriteDestination.upsert({
    where: {
      riderId_label_lat_lng: { riderId: rider.id, label, lat, lng },
    },
    update: { lastUsedAt: new Date(), emoji },
    create: { riderId: rider.id, label, lat, lng, emoji },
  });
  return ok(fav);
}

/** DELETE /api/favorites?id=... */
export async function DELETE(req: NextRequest) {
  const rider = await resolveRider();
  if (!rider) return unauthorized();
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return fail("id required.");
  await db.favoriteDestination.deleteMany({ where: { id, riderId: rider.id } });
  return ok({ deleted: true });
}

/** PATCH /api/favorites?id=... — touch lastUsedAt (mark as recently used). */
export async function PATCH(req: NextRequest) {
  const rider = await resolveRider();
  if (!rider) return unauthorized();
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return fail("id required.");
  await db.favoriteDestination.updateMany({
    where: { id, riderId: rider.id },
    data: { lastUsedAt: new Date() },
  });
  return ok({ updated: true });
}
