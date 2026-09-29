import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveRider } from "@/lib/auth";
import { ok, fail, unauthorized, rateLimited } from "@/lib/api";
import { rateLimit, getClientIp } from "@/lib/security";

export const runtime = "nodejs";

/** GET /api/alerts?unreadOnly=true — list the rider's alerts. */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, 3);
  if (!rl.ok) return rateLimited(rl.retryAfterMs);

  const rider = await resolveRider();
  if (!rider) return unauthorized();

  const unreadOnly = req.nextUrl.searchParams.get("unreadOnly") === "true";
  const limit = Math.min(50, Math.max(5, Number(req.nextUrl.searchParams.get("limit") ?? 20) || 20));

  const alerts = await db.alertRecord.findMany({
    where: { riderId: rider.id, ...(unreadOnly ? { read: false } : {}) },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const unreadCount = await db.alertRecord.count({
    where: { riderId: rider.id, read: false },
  });

  return ok({ alerts, unreadCount });
}

/** POST /api/alerts — create an alert (internal use: triggered by risk/hazard changes). */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, 10);
  if (!rl.ok) return rateLimited(rl.retryAfterMs);

  const rider = await resolveRider();
  if (!rider) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const type = ["severe_weather", "new_hazard_nearby", "risk_escalation", "sos_ack"].includes(body.type)
    ? body.type
    : null;
  if (!type) return fail("Invalid alert type.");
  const severity = ["info", "warning", "critical"].includes(body.severity) ? body.severity : "info";
  const title = String(body.title ?? "").slice(0, 120);
  const bodyText = String(body.body ?? "").slice(0, 500);
  const data = body.data ? JSON.stringify(body.data).slice(0, 1000) : null;
  if (!title) return fail("title required.");

  const alert = await db.alertRecord.create({
    data: { riderId: rider.id, type, severity, title, body: bodyText, data },
  });
  return ok(alert);
}

/** PATCH /api/alerts — mark alerts as read. Body: { ids?: string[] } or { all: true }. */
export async function PATCH(req: NextRequest) {
  const rider = await resolveRider();
  if (!rider) return unauthorized();
  const body = await req.json().catch(() => ({}));
  if (body.all) {
    await db.alertRecord.updateMany({
      where: { riderId: rider.id, read: false },
      data: { read: true },
    });
    return ok({ markedAll: true });
  }
  const ids: string[] = Array.isArray(body.ids) ? body.ids.filter((x: unknown) => typeof x === "string") : [];
  if (ids.length === 0) return fail("Provide ids[] or { all: true }.");
  await db.alertRecord.updateMany({
    where: { riderId: rider.id, id: { in: ids } },
    data: { read: true },
  });
  return ok({ marked: ids.length });
}
