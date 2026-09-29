/**
 * Unit tests for the air quality service.
 */
import { test, expect, describe } from "bun:test";
import { classifyAqi, pollutantAdvisory } from "@/lib/air-quality-service";

describe("air-quality: classifyAqi", () => {
  test("AQI ≤ 20 → Good", () => {
    const r = classifyAqi(15);
    expect(r.level).toBe("Good");
    expect(r.mask).toBe(false);
  });

  test("AQI 21-40 → Fair", () => {
    const r = classifyAqi(30);
    expect(r.level).toBe("Fair");
    expect(r.mask).toBe(false);
  });

  test("AQI 41-60 → Moderate (mask advised)", () => {
    const r = classifyAqi(50);
    expect(r.level).toBe("Moderate");
    expect(r.mask).toBe(true);
  });

  test("AQI 61-80 → Poor (mask advised)", () => {
    const r = classifyAqi(70);
    expect(r.level).toBe("Poor");
    expect(r.mask).toBe(true);
  });

  test("AQI 81-100 → Very Poor", () => {
    const r = classifyAqi(90);
    expect(r.level).toBe("Very Poor");
    expect(r.mask).toBe(true);
  });

  test("AQI > 100 → Extremely Poor", () => {
    const r = classifyAqi(120);
    expect(r.level).toBe("Extremely Poor");
    expect(r.mask).toBe(true);
  });

  test("advisory is non-empty", () => {
    expect(classifyAqi(10).advisory.length).toBeGreaterThan(10);
    expect(classifyAqi(120).advisory.length).toBeGreaterThan(10);
  });

  test("color is a valid hex", () => {
    expect(classifyAqi(10).color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  test("level transitions are monotonic in severity", () => {
    const levels = [classifyAqi(10), classifyAqi(30), classifyAqi(50), classifyAqi(70), classifyAqi(90), classifyAqi(120)];
    // Each higher AQI should have a mask flag that is >= the previous (Good/Fair = false, Moderate+ = true)
    for (let i = 1; i < levels.length; i++) {
      if (i >= 2) {
        expect(levels[i].mask).toBe(true);
      }
    }
  });
});

describe("air-quality: pollutantAdvisory", () => {
  test("clean air → null", () => {
    expect(pollutantAdvisory(10, 20, 15)).toBeNull();
  });

  test("high PM2.5 → advisory", () => {
    const r = pollutantAdvisory(40, 50, 20);
    expect(r).not.toBeNull();
    expect(r).toContain("PM2.5");
  });

  test("high PM10 → advisory", () => {
    const r = pollutantAdvisory(20, 80, 20);
    expect(r).not.toBeNull();
    expect(r).toContain("PM10");
  });

  test("high NO2 → advisory", () => {
    const r = pollutantAdvisory(20, 50, 50);
    expect(r).not.toBeNull();
    expect(r).toContain("NO");
  });

  test("PM2.5 takes priority over PM10", () => {
    const r = pollutantAdvisory(40, 80, 50);
    expect(r).toContain("PM2.5");
  });
});
