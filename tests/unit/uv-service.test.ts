/**
 * Unit tests for the UV index service.
 */
import { test, expect, describe } from "bun:test";
import { classifyUv, formatBurnTime } from "@/lib/uv-service";

describe("uv-service: classifyUv", () => {
  test("UV < 3 → Low", () => {
    const r = classifyUv(1);
    expect(r.level).toBe("Low");
    expect(r.sunscreen).toBe(false);
  });

  test("UV 3-5 → Moderate (sunscreen)", () => {
    const r = classifyUv(4);
    expect(r.level).toBe("Moderate");
    expect(r.sunscreen).toBe(true);
  });

  test("UV 6-7 → High", () => {
    const r = classifyUv(7);
    expect(r.level).toBe("High");
    expect(r.sunscreen).toBe(true);
  });

  test("UV 8-10 → Very High", () => {
    const r = classifyUv(9);
    expect(r.level).toBe("Very High");
    expect(r.sunscreen).toBe(true);
  });

  test("UV ≥ 11 → Extreme", () => {
    const r = classifyUv(12);
    expect(r.level).toBe("Extreme");
    expect(r.sunscreen).toBe(true);
  });

  test("burn time decreases as UV increases", () => {
    const low = classifyUv(1);
    const high = classifyUv(9);
    expect(high.burnTimeMin).toBeLessThan(low.burnTimeMin);
  });

  test("advisory is non-empty", () => {
    expect(classifyUv(1).advisory.length).toBeGreaterThan(10);
    expect(classifyUv(12).advisory.length).toBeGreaterThan(10);
  });

  test("color is a valid hex", () => {
    expect(classifyUv(1).color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(classifyUv(12).color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  test("UV 0 → Low", () => {
    expect(classifyUv(0).level).toBe("Low");
  });

  test("boundary: UV 3 → Moderate", () => {
    expect(classifyUv(3).level).toBe("Moderate");
  });

  test("boundary: UV 8 → Very High", () => {
    expect(classifyUv(8).level).toBe("Very High");
  });

  test("boundary: UV 11 → Extreme", () => {
    expect(classifyUv(11).level).toBe("Extreme");
  });
});

describe("uv-service: formatBurnTime", () => {
  test("minutes < 60 → Xm format", () => {
    expect(formatBurnTime(30)).toBe("30min until sunburn");
  });

  test("minutes >= 60 → Hh format", () => {
    expect(formatBurnTime(60)).toBe("1h until sunburn");
    expect(formatBurnTime(120)).toBe("2h until sunburn");
  });

  test("5 minutes → 5min", () => {
    expect(formatBurnTime(5)).toBe("5min until sunburn");
  });
});
