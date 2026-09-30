/**
 * API integration tests for RIVO.
 *
 * These tests verify the API response shapes and business logic by calling
 * the route handlers directly (no HTTP server needed). They mock the database
 * and external services to keep tests fast and deterministic.
 *
 * NOTE: The deterministic risk engine is the source of truth — these tests
 * verify the API correctly wires inputs → engine → response.
 */
import { test, expect, describe, mock, beforeEach } from "bun:test";
import { NextRequest } from "next/server";

/** Build a NextRequest with query params (the routes use req.nextUrl.searchParams). */
function makeReq(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, "https://test.local"), init as unknown as Record<string, unknown> | undefined);
}

// Mock the db module before importing routes.
const mockDb = {
  hazardReport: {
    findMany: mock(() => Promise.resolve([])),
    count: mock(() => Promise.resolve(0)),
    create: mock(() => Promise.resolve({ id: "h1", type: "pothole", severity: "moderate", lat: 12.97, lng: 77.64, status: "active", createdAt: new Date(), reporter: { displayName: "Rider-TEST" } })),
  },
  rider: {
    findUnique: mock(() => Promise.resolve(null)),
    findMany: mock(() => Promise.resolve([])) as unknown as ReturnType<typeof mock>,
    update: mock(() => Promise.resolve({})),
  },
  trackingSession: {
    findFirst: mock(() => Promise.resolve(null)),
  },
  riskAssessment: {
    create: mock(() => Promise.resolve({})),
    findMany: mock(() => Promise.resolve([])),
    count: mock(() => Promise.resolve(0)),
  },
  weatherCache: {
    findFirst: mock(() => Promise.resolve(null)),
    create: mock(() => Promise.resolve({})),
  },
  $transaction: mock((fn: unknown) => (typeof fn === "function" ? fn(mockDb) : Promise.resolve([]))),
};

mock.module("@/lib/db", () => ({ db: mockDb }));

// Mock auth to return a test rider.
mock.module("@/lib/auth", () => ({
  resolveRider: mock(() =>
    Promise.resolve({ id: "rider-test", displayName: "Rider-TEST", reputation: 5 }),
  ),
  getOrCreateRider: mock(() =>
    Promise.resolve({ id: "rider-test", displayName: "Rider-TEST", reputation: 5, isNew: false }),
  ),
}));

// Mock weather service to return deterministic data.
mock.module("@/lib/weather-service", () => ({
  getWeather: mock(() =>
    Promise.resolve({
      tempC: 22,
      apparentTempC: 22,
      windSpeedKph: 10,
      windGustKph: 12,
      precipMm: 0,
      precipProbability: 0.1,
      humidity: 50,
      visibilityM: 10000,
      cloudCover: 20,
      weatherCode: 0,
      isDay: true,
    }),
  ),
  getPrecipProbability: mock(() => Promise.resolve(0.1)),
  describeWeatherCode: mock(() => "Clear"),
}));

// Mock routing service.
mock.module("@/lib/routing-service", () => ({
  getRoute: mock(() =>
    Promise.resolve({
      distanceKm: 5.2,
      durationMin: 14,
      geometry: [{ lat: 12.97, lng: 77.64 }, { lat: 12.98, lng: 77.65 }],
      source: "osrm",
    }),
  ),
  getRouteAlternatives: mock(() =>
    Promise.resolve([
      { distanceKm: 5.2, durationMin: 14, geometry: [{ lat: 12.97, lng: 77.64 }], source: "osrm-alt" },
    ]),
  ),
}));

describe("API: GET /api/risk", () => {
  beforeEach(() => {
    mockDb.hazardReport.findMany.mockImplementation(() => Promise.resolve([]));
    mockDb.riskAssessment.create.mockImplementation(() => Promise.resolve({}));
  });

  test("returns a valid risk assessment with score 0-100", async () => {
    const { GET } = await import("@/app/api/risk/route");
    const req = makeReq("/api/risk?originLat=12.97&originLng=77.64&destLat=12.98&destLng=77.65");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.score).toBeGreaterThanOrEqual(0);
    expect(json.data.score).toBeLessThanOrEqual(100);
    expect(["low", "moderate", "high", "severe"]).toContain(json.data.level);
  });

  test("includes factors array sorted by weight desc", async () => {
    const { GET } = await import("@/app/api/risk/route");
    const req = makeReq("/api/risk?originLat=12.97&originLng=77.64&destLat=12.98&destLng=77.65");
    const res = await GET(req);
    const json = await res.json();
    expect(Array.isArray(json.data.factors)).toBe(true);
    for (let i = 1; i < json.data.factors.length; i++) {
      expect(json.data.factors[i - 1].weight).toBeGreaterThanOrEqual(json.data.factors[i].weight);
    }
  });

  test("includes route with distance and geometry", async () => {
    const { GET } = await import("@/app/api/risk/route");
    const req = makeReq("/api/risk?originLat=12.97&originLng=77.64&destLat=12.98&destLng=77.65");
    const res = await GET(req);
    const json = await res.json();
    expect(json.data.route).not.toBeNull();
    expect(json.data.route.distanceKm).toBeGreaterThan(0);
    expect(Array.isArray(json.data.route.geometry)).toBe(true);
  });

  test("includes delivery impact when route is present", async () => {
    const { GET } = await import("@/app/api/risk/route");
    const req = makeReq("/api/risk?originLat=12.97&originLng=77.64&destLat=12.98&destLng=77.65");
    const res = await GET(req);
    const json = await res.json();
    expect(json.data.impact).not.toBeNull();
    expect(json.data.impact.adjustedDurationMin).toBeGreaterThanOrEqual(json.data.impact.baseDurationMin);
  });

  test("returns 400 when no coordinates provided", async () => {
    const { GET } = await import("@/app/api/risk/route");
    const req = makeReq("/api/risk");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});

describe("API: GET /api/leaderboard", () => {
  test("returns ranked leaderboard sorted by reputation", async () => {
    mockDb.rider.findMany = mock(() =>
      Promise.resolve([
        { id: "r1", displayName: "Rider-A", reputation: 10, reportsCount: 5, votesCount: 8, lastSeenAt: new Date() },
        { id: "r2", displayName: "Rider-B", reputation: 5, reportsCount: 2, votesCount: 3, lastSeenAt: new Date() },
      ]),
    );
    const { GET } = await import("@/app/api/leaderboard/route");
    const req = makeReq("/api/leaderboard?limit=10");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.leaderboard.length).toBe(2);
    expect(json.data.leaderboard[0].rank).toBe(1);
    expect(json.data.leaderboard[0].reputation).toBeGreaterThanOrEqual(json.data.leaderboard[1].reputation);
  });
});

describe("API: GET /api/weather", () => {
  test("returns weather snapshot with description", async () => {
    const { GET } = await import("@/app/api/weather/route");
    const req = makeReq("/api/weather?lat=12.97&lng=77.64");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.weather.tempC).toBeDefined();
    expect(typeof json.data.description).toBe("string");
  });

  test("returns 400 for invalid coordinates", async () => {
    const { GET } = await import("@/app/api/weather/route");
    const req = makeReq("/api/weather");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});
