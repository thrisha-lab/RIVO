/**
 * Unit tests for the delivery impact estimator.
 */
import { test, expect, describe } from "bun:test";
import { estimateDeliveryImpact } from "@/lib/delivery-impact";
import { assessRisk, type WeatherSnapshot } from "@/lib/risk-engine";

const clearWeather: WeatherSnapshot = {
  tempC: 22,
  apparentTempC: 22,
  windSpeedKph: 8,
  windGustKph: 10,
  precipMm: 0,
  precipProbability: 0.1,
  humidity: 50,
  visibilityM: 10000,
  cloudCover: 20,
  weatherCode: 0,
  isDay: true,
};

function makeRisk(weather: WeatherSnapshot | null, hazardCount = 0, severeCount = 0) {
  return assessRisk({
    weather,
    hazards: { activeCount: hazardCount, severeCount },
    route: { distanceKm: 10, durationMin: 25 },
    now: new Date("2025-01-01T13:00:00"),
  });
}

describe("delivery-impact: estimateDeliveryImpact", () => {
  test("returns null when no route", () => {
    const risk = makeRisk(clearWeather);
    expect(estimateDeliveryImpact(risk, clearWeather, null)).toBeNull();
  });

  test("returns null when duration is 0", () => {
    const risk = makeRisk(clearWeather);
    expect(estimateDeliveryImpact(risk, clearWeather, { distanceKm: 5, durationMin: 0 })).toBeNull();
  });

  test("clear weather → minimal extra time", () => {
    const risk = makeRisk(clearWeather);
    const impact = estimateDeliveryImpact(risk, clearWeather, { distanceKm: 10, durationMin: 25 });
    expect(impact).not.toBeNull();
    expect(impact!.extraMinutes).toBeLessThanOrEqual(2);
    expect(impact!.worthIt).toBe("yes");
  });

  test("heavy rain → significant slowdown", () => {
    const stormy = { ...clearWeather, precipMm: 8, windGustKph: 30 };
    const risk = makeRisk(stormy);
    const impact = estimateDeliveryImpact(risk, stormy, { distanceKm: 10, durationMin: 25 });
    expect(impact!.slowDownPct).toBeGreaterThanOrEqual(20);
    expect(impact!.extraMinutes).toBeGreaterThanOrEqual(5);
  });

  test("strong gusts add slowdown", () => {
    const windy = { ...clearWeather, windGustKph: 55 };
    const risk = makeRisk(windy);
    const impact = estimateDeliveryImpact(risk, windy, { distanceKm: 10, durationMin: 25 });
    expect(impact!.slowDownPct).toBeGreaterThan(0);
  });

  test("poor visibility adds slowdown", () => {
    const foggy = { ...clearWeather, visibilityM: 500 };
    const risk = makeRisk(foggy);
    const impact = estimateDeliveryImpact(risk, foggy, { distanceKm: 10, durationMin: 25 });
    expect(impact!.slowDownPct).toBeGreaterThan(10);
  });

  test("night adds 5% slowdown", () => {
    const night = { ...clearWeather, isDay: false };
    const risk = makeRisk(night);
    const impact = estimateDeliveryImpact(risk, night, { distanceKm: 10, durationMin: 25 });
    expect(impact!.slowDownPct).toBeGreaterThanOrEqual(5);
  });

  test("slowdown capped at 60%", () => {
    const extreme = { ...clearWeather, precipMm: 50, windGustKph: 90, visibilityM: 100, isDay: false };
    const risk = makeRisk(extreme);
    const impact = estimateDeliveryImpact(risk, extreme, { distanceKm: 10, durationMin: 25 });
    expect(impact!.slowDownPct).toBeLessThanOrEqual(60);
  });

  test("adjusted duration > base duration when slowdown > 0", () => {
    const rainy = { ...clearWeather, precipMm: 5, windGustKph: 40 };
    const risk = makeRisk(rainy);
    const impact = estimateDeliveryImpact(risk, rainy, { distanceKm: 10, durationMin: 25 });
    expect(impact!.adjustedDurationMin).toBeGreaterThan(impact!.baseDurationMin);
  });

  test("reason string is populated when slowdown > 0", () => {
    const rainy = { ...clearWeather, precipMm: 5 };
    const risk = makeRisk(rainy);
    const impact = estimateDeliveryImpact(risk, rainy, { distanceKm: 10, durationMin: 25 });
    expect(impact!.reason).toContain("rain");
  });

  test("worthIt is 'yes' for low risk", () => {
    const risk = makeRisk(clearWeather);
    const impact = estimateDeliveryImpact(risk, clearWeather, { distanceKm: 10, durationMin: 25 });
    expect(impact!.worthIt).toBe("yes");
  });

  test("worthIt reason is non-empty", () => {
    const risk = makeRisk(clearWeather);
    const impact = estimateDeliveryImpact(risk, clearWeather, { distanceKm: 10, durationMin: 25 });
    expect(impact!.worthItReason.length).toBeGreaterThan(10);
  });
});
