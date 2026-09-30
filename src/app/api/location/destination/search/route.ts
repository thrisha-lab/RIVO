import { NextRequest } from "next/server";
import { searchPlaces } from "@/lib/geocode-service";
import { ok, fail, rateLimited } from "@/lib/api";
import { rateLimit, getClientIp, sanitizeText } from "@/lib/security";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, 3);
  if (!rl.ok) return rateLimited(rl.retryAfterMs);

  const q = req.nextUrl.searchParams.get("q") ?? "";
  const clean = sanitizeText(q, 100);
  if (clean.length < 2) return fail("Query too short.");

  const results = await searchPlaces(clean, 8);
  return ok({ results });
}
