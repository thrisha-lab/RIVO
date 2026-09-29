import { NextRequest } from "next/server";
import { explainRisk } from "@/lib/ai-explain";
import { ok, fail, rateLimited } from "@/lib/api";
import { rateLimit, getClientIp } from "@/lib/security";

export const runtime = "nodejs";

/**
 * POST /api/ai/explain
 * Body: { risk: RiskAssessmentResult, weather: WeatherSnapshot|null, originLabel?, destLabel? }
 *
 * The AI only explains an already-computed risk. It must NOT recompute it.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, 5);
  if (!rl.ok) return rateLimited(rl.retryAfterMs);

  const body = await req.json().catch(() => ({}));
  const { risk, weather, originLabel, destLabel } = body as {
    risk: unknown;
    weather: unknown;
    originLabel?: string;
    destLabel?: string;
  };
  if (!risk || typeof risk !== "object") return fail("Missing risk assessment payload.");

  const explanation = await explainRisk({
    risk: risk as Parameters<typeof explainRisk>[0]["risk"],
    weather: (weather as Parameters<typeof explainRisk>[0]["weather"]) ?? null,
    originLabel,
    destLabel,
  });
  return ok(explanation);
}
