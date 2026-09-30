/**
 * AI explanation service — server-side only.
 *
 * CRITICAL CONTRACT:
 *  - The deterministic risk engine (src/lib/risk-engine.ts) is the source of truth.
 *  - This service may ONLY narrate/explain the already-computed risk.
 *  - It must NEVER compute a score, override a level, or change thresholds.
 *  - It receives the final RiskAssessmentResult and produces helpful prose.
 */
import ZAI from "z-ai-web-dev-sdk";
import type { RiskAssessmentResult, WeatherSnapshot } from "@/lib/risk-engine";
import { describeWeatherCode } from "@/lib/weather-service";

const SYSTEM_PROMPT = `You are RIVO, an AI weather-safety co-pilot for delivery riders (motorcycles, scooters, bicycles).
You receive a risk assessment that was ALREADY computed by a deterministic engine. Your job:
- Explain WHY the risk level is what it is, in plain, calm, rider-friendly language.
- Give 2-3 concrete, actionable safety tips for THIS specific trip and weather.
- Be concise (max ~140 words). Use short sentences. No markdown headings.
- Never claim the risk could be different, never recompute scores, never override safety advice.
- If precipitation or wind is present, mention protective gear.
- Be warm but never alarmist. Match urgency to severity.

You must output a single JSON object: {"explanation": string, "tips": string[]}
tips must be an array of 2-3 short strings.`;

export interface AIExplanation {
  explanation: string;
  tips: string[];
}

export async function explainRisk(opts: {
  risk: RiskAssessmentResult;
  weather: WeatherSnapshot | null;
  originLabel?: string;
  destLabel?: string;
}): Promise<AIExplanation> {
  const { risk, weather } = opts;
  const ctx = buildContext(opts);

  try {
    const zai = await ZAI.create();
    const res = await zai.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: ctx },
      ],
      temperature: 0.4,
      max_tokens: 400,
    });
    const text = res.choices?.[0]?.message?.content ?? "";
    return parseAIJson(text, risk);
  } catch {
    return fallbackExplanation(risk, weather);
  }
}

function buildContext(opts: {
  risk: RiskAssessmentResult;
  weather: WeatherSnapshot | null;
  originLabel?: string;
  destLabel?: string;
}): string {
  const { risk, weather, originLabel, destLabel } = opts;
  const lines: string[] = [];
  lines.push(`Risk score: ${risk.score}/100`);
  lines.push(`Risk level: ${risk.level.toUpperCase()}`);
  lines.push(`Origin: ${originLabel ?? "current location"}`);
  lines.push(`Destination: ${destLabel ?? "unspecified"}`);
  if (weather) {
    lines.push(
      `Weather: ${describeWeatherCode(weather.weatherCode)}, ${weather.tempC.toFixed(0)}°C (feels ${weather.apparentTempC.toFixed(0)}°C), wind ${Math.round(weather.windSpeedKph)} km/h gusts ${Math.round(weather.windGustKph)} km/h, precipitation ${weather.precipMm.toFixed(1)} mm, visibility ${Math.round(weather.visibilityM)} m, ${weather.isDay ? "daytime" : "night"}.`,
    );
  } else {
    lines.push("Weather: unavailable");
  }
  lines.push(
    "Risk factors (factor, weight, detail):\n" +
      risk.factors.map((f) => `- ${f.factor} (weight ${f.weight}): ${f.detail}`).join("\n"),
  );
  lines.push(`Engine recommendation: ${risk.recommendation}`);
  return lines.join("\n");
}

function parseAIJson(text: string, risk: RiskAssessmentResult): AIExplanation {
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const obj = JSON.parse(text.slice(start, end + 1));
      const explanation = typeof obj.explanation === "string" ? obj.explanation : "";
      const tips = Array.isArray(obj.tips)
        ? obj.tips.filter((t: unknown) => typeof t === "string").slice(0, 3)
        : [];
      if (explanation) return { explanation, tips };
    }
  } catch {
    // fall through
  }
  return { explanation: text.trim().slice(0, 400), tips: [] };
}

function fallbackExplanation(risk: RiskAssessmentResult, weather: WeatherSnapshot | null): AIExplanation {
  const tips: string[] = [];
  if (weather && (weather.precipMm >= 1 || weather.precipProbability > 0.5)) {
    tips.push("Wear waterproof jacket, gloves, and over-trousers; treat visor with anti-fog.");
  }
  if (weather && (weather.windGustKph ?? weather.windSpeedKph) >= 35) {
    tips.push("Reduce speed and grip firmly — gusts can push you across the lane.");
  }
  if (!weather?.isDay) {
    tips.push("Use high-visibility gear and check your headlight before departing.");
  }
  if (tips.length === 0) {
    tips.push("Ride defensively and keep braking distance generous.");
    tips.push("Stay hydrated and take a short break every 45 minutes.");
  }
  return {
    explanation: `${risk.level.toUpperCase()} risk (${risk.score}/100). ${risk.recommendation}`,
    tips,
  };
}
