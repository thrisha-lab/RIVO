/**
 * Unit tests for geo helpers — haversine, bbox, polyline sampling.
 */
import { test, expect, describe } from "bun:test";
import {
  haversineKm,
  haversineM,
  bboxAround,
  bearingDeg,
  samplePolyline,
  formatDistance,
  toRad,
} from "@/lib/geo";

describe("geo: toRad", () => {
  test("0 deg → 0 rad", () => {
    expect(toRad(0)).toBe(0);
  });
  test("180 deg → π rad", () => {
    expect(toRad(180)).toBeCloseTo(Math.PI, 5);
  });
  test("90 deg → π/2 rad", () => {
    expect(toRad(90)).toBeCloseTo(Math.PI / 2, 5);
  });
});

describe("geo: haversineKm", () => {
  test("same point → 0 km", () => {
    expect(haversineKm({ lat: 12.97, lng: 77.64 }, { lat: 12.97, lng: 77.64 })).toBe(0);
  });

  test("Bengaluru MG Road to Indiranagar ≈ 4 km", () => {
    const mg = { lat: 12.9756, lng: 77.6066 };
    const ind = { lat: 12.9719, lng: 77.6412 };
    const d = haversineKm(mg, ind);
    expect(d).toBeGreaterThan(3);
    expect(d).toBeLessThan(5);
  });

  test("distance is symmetric", () => {
    const a = { lat: 12.97, lng: 77.64 };
    const b = { lat: 13.0, lng: 77.7 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 5);
  });

  test("returns positive distance", () => {
    const d = haversineKm({ lat: 12.97, lng: 77.64 }, { lat: 13.0, lng: 77.7 });
    expect(d).toBeGreaterThan(0);
  });
});

describe("geo: haversineM", () => {
  test("1000x of haversineKm", () => {
    const a = { lat: 12.97, lng: 77.64 };
    const b = { lat: 12.98, lng: 77.65 };
    expect(haversineM(a, b)).toBeCloseTo(haversineKm(a, b) * 1000, 1);
  });
});

describe("geo: bboxAround", () => {
  test("bbox contains center", () => {
    const c = { lat: 12.97, lng: 77.64 };
    const b = bboxAround(c, 1000);
    expect(b.minLat).toBeLessThan(c.lat);
    expect(b.maxLat).toBeGreaterThan(c.lat);
    expect(b.minLng).toBeLessThan(c.lng);
    expect(b.maxLng).toBeGreaterThan(c.lng);
  });

  test("larger radius → larger bbox", () => {
    const c = { lat: 12.97, lng: 77.64 };
    const small = bboxAround(c, 500);
    const large = bboxAround(c, 2000);
    expect(large.maxLat - large.minLat).toBeGreaterThan(small.maxLat - small.minLat);
  });

  test("bbox at equator is symmetric in lat", () => {
    const c = { lat: 0, lng: 0 };
    const b = bboxAround(c, 1110); // ~1km
    expect(b.maxLat).toBeCloseTo(-b.minLat, 4);
  });
});

describe("geo: bearingDeg", () => {
  test("east bearing ≈ 90", () => {
    const a = { lat: 0, lng: 0 };
    const b = { lat: 0, lng: 0.01 };
    expect(bearingDeg(a, b)).toBeCloseTo(90, 0);
  });

  test("north bearing ≈ 0", () => {
    const a = { lat: 0, lng: 0 };
    const b = { lat: 0.01, lng: 0 };
    const brg = bearingDeg(a, b);
    expect(brg).toBeGreaterThan(-5);
    expect(brg).toBeLessThan(5);
  });
});

describe("geo: samplePolyline", () => {
  test("empty input → empty output", () => {
    expect(samplePolyline([], 5)).toHaveLength(0);
  });

  test("single point → repeated samples", () => {
    const out = samplePolyline([{ lat: 1, lng: 1 }], 3);
    expect(out).toHaveLength(3);
    expect(out[0].lat).toBe(1);
  });

  test("returns requested number of samples", () => {
    const coords = [
      { lat: 12.97, lng: 77.64 },
      { lat: 12.98, lng: 77.65 },
      { lat: 12.99, lng: 77.66 },
    ];
    const out = samplePolyline(coords, 5);
    expect(out).toHaveLength(5);
  });

  test("first sample ≈ first point, last sample ≈ last point", () => {
    const coords = [
      { lat: 12.97, lng: 77.64 },
      { lat: 12.99, lng: 77.66 },
    ];
    const out = samplePolyline(coords, 5);
    expect(out[0].lat).toBeCloseTo(12.97, 3);
    expect(out[out.length - 1].lat).toBeCloseTo(12.99, 3);
  });
});

describe("geo: formatDistance", () => {
  test("less than 1km → meters", () => {
    expect(formatDistance(0.5)).toBe("500 m");
  });

  test("1km+ → km with one decimal", () => {
    expect(formatDistance(3.456)).toBe("3.5 km");
  });

  test("0 km → 0 m", () => {
    expect(formatDistance(0)).toBe("0 m");
  });
});
