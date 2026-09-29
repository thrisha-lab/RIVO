import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveRider } from "@/lib/auth";
import { ok, fail, unauthorized, rateLimited } from "@/lib/api";
import { rateLimit, getClientIp, sanitizeText } from "@/lib/security";

export const runtime = "nodejs";

/** GET /api/sos/contacts — list the rider's emergency contacts. */
export async function GET() {
  const rider = await resolveRider();
  if (!rider) return unauthorized();
  const contacts = await db.sosContact.findMany({
    where: { riderId: rider.id },
    orderBy: { createdAt: "asc" },
  });
  return ok({ contacts });
}

/** POST /api/sos/contacts — add an emergency contact. */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, 5);
  if (!rl.ok) return rateLimited(rl.retryAfterMs);

  const rider = await resolveRider();
  if (!rider) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const name = sanitizeText(body.name, 80);
  const phone = sanitizeText(body.phone, 30);
  const relation = ["family", "friend", "coworker", "other"].includes(body.relation)
    ? body.relation
    : "family";
  if (!name || !phone) return fail("Name and phone are required.");
  // Basic phone validation: digits, +, spaces, -, ()
  if (!/^[+]?[\d\s\-()]{6,20}$/.test(phone)) return fail("Invalid phone number.");

  const contact = await db.sosContact.create({
    data: { riderId: rider.id, name, phone, relation },
  });
  return ok(contact);
}

/** DELETE /api/sos/contacts?id=... — remove a contact. */
export async function DELETE(req: NextRequest) {
  const rider = await resolveRider();
  if (!rider) return unauthorized();
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return fail("Contact id required.");
  await db.sosContact.deleteMany({ where: { id, riderId: rider.id } });
  return ok({ deleted: true });
}
