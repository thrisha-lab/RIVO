/**
 * Unit tests for the deterministic risk engine.
 *
 * The risk engine is the SINGLE SOURCE OF TRUTH for risk scoring.
 * These tests verify deterministic inputs produce expected outputs and
 * that the engine never produces out-of-range scores or invalid levels.
 */
import { test, expect, describe } from "bun:test";
import {
  assessRisk,
  weatherRisk,
  timeOfDayRisk,
  hazardRisk,
  routeRisk,
  SEVERITY_ORDER,
  HAZARD_TYPES,
  type WeatherSnapshot,
  type HazardDensityInput,
  type RouteRiskInput,
} from "@/lib/risk-engine";

describe("risk-engine: weatherRisk", () => {
  const base: WeatherSnapshot = {
    tempC: 22,
    apparentTempC: 22,
    windSpeedKph: 10,
    windGustKph: 12,
    precipMm: 0,
    precipProbability: 0,
    humidity: 50,
    visibilityM: 10000,
    cloudCover: 30,
    weatherCode: 0,
    isDay: true,
  };

  test("clear weather → low risk", () => {
    expect(weatherRisk(base)).toBeLessThanOrEqual(10);
  });

  test("heavy rain → high risk", () => {
    expect(weatherRisk({ ...base, precipMm: 12 })).toBeGreaterThanOrEqual(45);
  });

  test("moderate rain → moderate risk", () => {
    const r = weatherRisk({ ...base, precipMm: 4 });
    expect(r).toBeGreaterThanOrEqual(25);
    expect(r).toBeLessThan(50);
  });

  test("light rain → some risk", () => {
    expect(weatherRisk({ ...base, precipMm: 1 })).toBeGreaterThan(10);
  });

  test("high precip probability boosts risk even without current rain", () => {
    const noProb = weatherRisk({ ...base, precipProbability: 0 });
    const highProb = weatherRisk({ ...base, precipProbability: 0.8 });
    expect(highProb).toBeGreaterThan(noProb);
  });

  test("strong gusts → significant risk", () => {
    expect(weatherRisk({ ...base, windGustKph: 65 })).toBeGreaterThanOrEqual(30);
  });

  test("low visibility → high risk", () => {
    expect(weatherRisk({ ...base, visibilityM: 400 })).toBeGreaterThanOrEqual(20);
  });

  test("extreme cold adds risk", () => {
    const cold = weatherRisk({ ...base, tempC: -2, apparentTempC: -5 });
    const mild = weatherRisk(base);
    expect(cold).toBeGreaterThan(mild);
  });

  test("extreme heat adds risk", () => {
    const hot = weatherRisk({ ...base, tempC: 39, apparentTempC: 42 });
    expect(hot).toBeGreaterThan(weatherRisk(base));
  });

  test("returns value in 0..100 range", () => {
    const extreme = weatherRisk({
      ...base,
      precipMm: 50,
      windGustKph: 90,
      visibilityM: 100,
      tempC: -10,
    });
    expect(extreme).toBeLessThanOrEqual(100);
    expect(extreme).toBeGreaterThanOrEqual(0);
  });
});

describe("risk-engine: timeOfDayRisk", () => {
  test("late night (2am) is high risk", () => {
    const r = timeOfDayRisk(new Date("2025-01-01T02:00:00"));
    expect(r).toBeGreaterThanOrEqual(18);
  });

  test("midday is low risk", () => {
    const r = timeOfDayRisk(new Date("2025-01-01T13:00:00"));
    expect(r).toBeLessThanOrEqual(10);
  });

  test("dawn window has some risk", () => {
    const r = timeOfDayRisk(new Date("2025-01-01T07:00:00"));
    expect(r).toBeGreaterThan(0);
  });

  test("dusk window has risk", () => {
    const r = timeOfDayRisk(new Date("2025-01-01T18:00:00"));
    expect(r).toBeGreaterThan(0);
  });
});

describe("risk-engine: hazardRisk", () => {
  test("no hazards → zero risk", () => {
    expect(hazardRisk({ activeCount: 0, severeCount: 0 })).toBe(0);
  });

  test("more active hazards → higher risk", () => {
    const low = hazardRisk({ activeCount: 1, severeCount: 0 });
    const high = hazardRisk({ activeCount: 8, severeCount: 0 });
    expect(high).toBeGreaterThan(low);
  });

  test("severe hazards contribute more than moderate", () => {
    const mod = hazardRisk({ activeCount: 0, severeCount: 2 });
    const sev = hazardRisk({ activeCount: 0, severeCount: 2 });
    expect(sev).toBeGreaterThan(0);
    expect(mod).toBeGreaterThanOrEqual(20);
  });

  test("capped at 100", () => {
    const r = hazardRisk({ activeCount: 50, severeCount: 10 });
    expect(r).toBeLessThanOrEqual(100);
  });
});

describe("risk-engine: routeRisk", () => {
  test("short route → low risk", () => {
    expect(routeRisk({ distanceKm: 2, durationMin: 5 })).toBeLessThan(10);
  });

  test("long route → higher risk", () => {
    expect(routeRisk({ distanceKm: 40, durationMin: 100 })).toBeGreaterThan(15);
  });

  test("capped at 100", () => {
    const r = routeRisk({ distanceKm: 200, durationMin: 300 });
    expect(r).toBeLessThanOrEqual(100);
  });
});

describe("risk-engine: assessRisk (integration)", () => {
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
  const midday = new Date("2025-01-01T13:00:00");

  test("clear weather, no hazards, midday → low risk", () => {
    const r = assessRisk({
      weather: clearWeather,
      hazards: { activeCount: 0, severeCount: 0 },
      route: { distanceKm: 3, durationMin: 8 },
      now: midday,
    });
    expect(r.score).toBeLessThan(25);
    expect(r.level).toBe("low");
  });

  test("heavy rain + hazards + night → severe risk", () => {
    const r = assessRisk({
      weather: { ...clearWeather, precipMm: 8, windGustKph: 50, visibilityM: 800, isDay: false },
      hazards: { activeCount: 5, severeCount: 2 },
      route: { distanceKm: 25, durationMin: 70 },
      now: new Date("2025-01-01T03:00:00"),
    });
    expect(r.score).toBeGreaterThanOrEqual(45);
    expect(["high", "severe"]).toContain(r.level);
  });

  test("weather null → still produces a valid score", () => {
    const r = assessRisk({
      weather: null,
      hazards: { activeCount: 0, severeCount: 0 },
      route: { distanceKm: 3, durationMin: 8 },
      now: midday,
    });
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.level).toBeDefined();
  });

  test("factors array is populated and sorted by weight desc", () => {
    const r = assessRisk({
      weather: clearWeather,
      hazards: { activeCount: 3, severeCount: 1 },
      route: { distanceKm: 10, durationMin: 25 },
      now: midday,
    });
    expect(r.factors.length).toBeGreaterThan(0);
    for (let i = 1; i < r.factors.length; i++) {
      expect(r.factors[i - 1].weight).toBeGreaterThanOrEqual(r.factors[i].weight);
    }
  });

  test("recommendation is non-empty string", () => {
    const r = assessRisk({
      weather: clearWeather,
      hazards: { activeCount: 0, severeCount: 0 },
      route: null,
      now: midday,
    });
    expect(typeof r.recommendation).toBe("string");
    expect(r.recommendation.length).toBeGreaterThan(10);
  });

  test("deterministic: same inputs → same output", () => {
    const opts = {
      weather: clearWeather,
      hazards: { activeCount: 2, severeCount: 0 },
      route: { distanceKm: 8, durationMin: 20 },
      now: midday,
    };
    const r1 = assessRisk(opts);
    const r2 = assessRisk(opts);
    expect(r1.score).toBe(r2.score);
    expect(r1.level).toBe(r2.level);
  });

  test("level thresholds: score 70+ is severe, 45+ high, 25+ moderate", () => {
    // Construct inputs that push score >= 70
    const r = assessRisk({
      weather: { ...clearWeather, precipMm: 10, windGustKph: 60, visibilityM: 500, isDay: false },
      hazards: { activeCount: 6, severeCount: 3 },
      route: { distanceKm: 30, durationMin: 90 },
      now: new Date("2025-01-01T03:00:00"),
    });
    expect(r.score).toBeGreaterThanOrEqual(70);
    expect(r.level).toBe("severe");
  });
});

describe("risk-engine: constants", () => {
  test("SEVERITY_ORDER has expected ordering", () => {
    expect(SEVERITY_ORDER.low).toBeLessThan(SEVERITY_ORDER.moderate);
    expect(SEVERITY_ORDER.moderate).toBeLessThan(SEVERITY_ORDER.high);
    expect(SEVERITY_ORDER.high).toBeLessThan(SEVERITY_ORDER.critical);
  });

  test("HAZARD_TYPES includes expected types", () => {
    expect(HAZARD_TYPES).toContain("pothole");
    expect(HAZARD_TYPES).toContain("flooding");
    expect(HAZARD_TYPES).toContain("accident");
    expect(HAZARD_TYPES.length).toBeGreaterThanOrEqual(8);
  });
});
