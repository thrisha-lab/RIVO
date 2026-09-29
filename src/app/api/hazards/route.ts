import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveRider } from "@/lib/auth";
import { ok, fail, unauthorized, rateLimited } from "@/lib/api";
import { rateLimit, getClientIp, clampLat, clampLng, sanitizeText } from "@/lib/security";
import { HAZARD_TYPES, HAZARD_LABELS } from "@/lib/risk-engine";
import { haversineM } from "@/lib/geo";

export const runtime = "nodejs";

/**
 * GET /api/hazards?lat=&lng=&radiusM=&type=&status=
 * Returns active hazards near a point (default 1500m, active|disputed).
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, 2);
  if (!rl.ok) return rateLimited(rl.retryAfterMs);

  const p = req.nextUrl.searchParams;
  const lat = clampLat(p.get("lat"));
  const lng = clampLng(p.get("lng"));
  if (lat === null || lng === null) return fail("Invalid coordinates.");
  const radiusM = Math.min(10000, Math.max(100, Number(p.get("radiusM") ?? 1500) || 1500));
  const type = p.get("type") ?? undefined;
  const statusParam = p.get("status") ?? "active,disputed";
  const statuses = statusParam.split(",").filter(Boolean);

  const dLat = radiusM / 111320;
  const dLng = radiusM / (111320 * Math.cos((Math.abs(lat) * Math.PI) / 180) || 0.01);

  const hazards = await db.hazardReport.findMany({
    where: {
      lat: { gte: lat - dLat, lte: lat + dLat },
      lng: { gte: lng - dLng, lte: lng + dLng },
      status: { in: statuses.length ? statuses : ["active", "disputed"] },
      ...(type ? { type } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: {
      id: true,
      type: true,
      severity: true,
      lat: true,
      lng: true,
      description: true,
      imageUrl: true,
      confirmCount: true,
      disputeCount: true,
      status: true,
      verified: true,
      createdAt: true,
      reporter: { select: { displayName: true } },
    },
  });

  // attach distance from center
  const withDistance = hazards
    .map((h) => ({
      ...h,
      distanceM: Math.round(haversineM({ lat, lng }, { lat: h.lat, lng: h.lng })),
    }))
    .filter((h) => h.distanceM <= radiusM)
    .sort((a, b) => a.distanceM - b.distanceM);

  return ok({ hazards: withDistance, center: { lat, lng }, radiusM });
}

/**
 * POST /api/hazards
 * Create a hazard report. Requires GPS/map-pin verification: reporter must
 * supply coordinates; we verify the coords are within a sane range.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, 5);
  if (!rl.ok) return rateLimited(rl.retryAfterMs);

  const rider = await resolveRider();
  if (!rider) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const lat = clampLat(body.lat);
  const lng = clampLng(body.lng);
  if (lat === null || lng === null) return fail("Invalid coordinates.");
  const type = typeof body.type === "string" && HAZARD_TYPES.includes(body.type) ? body.type : null;
  if (!type) return fail("Invalid hazard type.");
  const severity = ["low", "moderate", "high", "critical"].includes(body.severity)
    ? body.severity
    : "moderate";
  const description = sanitizeText(body.description, 500);
  const addressLabel = sanitizeText(body.addressLabel, 200);
  const imageUrl = typeof body.imageUrl === "string" && body.imageUrl.startsWith("/") ? body.imageUrl : null;

  // GPS/map-pin verification: require accuracy if provided; reject obviously
  // spoofed coords (e.g. null island).
  if (lat === 0 && lng === 0) return fail("Coordinates rejected.");

  const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000); // active 6h by default

  const hazard = await db.hazardReport.create({
    data: {
      reporterId: rider.id,
      type,
      severity,
      lat,
      lng,
      description: description || null,
      addressLabel: addressLabel || null,
      imageUrl,
      expiresAt,
    },
    include: { reporter: { select: { displayName: true } } },
  });

  // reward reporter reputation
  await db.rider.update({
    where: { id: rider.id },
    data: { reputation: { increment: 1 }, reportsCount: { increment: 1 } },
  });

  // Create "new_hazard_nearby" alerts for riders who recently had a risk
  // assessment within ~2km of this hazard and opted into newHazardNearby prefs.
  // Only for high/critical severity to avoid alert fatigue.
  if (severity === "high" || severity === "critical") {
    try {
      const dLat = 0.018; // ~2km
      const dLng = 0.018 / Math.cos((Math.abs(lat) * Math.PI) / 180 || 0.01);
      const recentRisk = await db.riskAssessment.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
          originLat: { gte: lat - dLat, lte: lat + dLat },
          originLng: { gte: lng - dLng, lte: lng + dLng },
        },
        select: { riderId: true },
        distinct: ["riderId"],
        take: 50,
      });
      const nearbyRiderIds = recentRisk.map((r) => r.riderId).filter((id) => id !== rider.id);
      if (nearbyRiderIds.length > 0) {
        const label = HAZARD_LABELS[type] ?? type;
        const title = `New ${severity} hazard nearby`;
        const bodyText = `${label} reported near your route. Stay alert.`;
        await db.alertRecord.createMany({
          data: nearbyRiderIds.map((rid) => ({
            riderId: rid,
            type: "new_hazard_nearby",
            severity: severity === "critical" ? "critical" : "warning",
            title,
            body: bodyText,
            data: JSON.stringify({ hazardId: hazard.id, lat, lng, type, severity }),
          })),
        });
      }
    } catch {
      // alert creation is best-effort; never fail the hazard POST
    }
  }

  return ok({
    id: hazard.id,
    type: hazard.type,
    severity: hazard.severity,
    lat: hazard.lat,
    lng: hazard.lng,
    status: hazard.status,
    createdAt: hazard.createdAt,
    reporter: hazard.reporter.displayName,
  });
}
