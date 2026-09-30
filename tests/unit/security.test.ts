/**
 * Unit tests for the security helpers.
 */
import { test, expect, describe } from "bun:test";
import {
  rateLimit,
  getClientIp,
  sanitizeText,
  clampLat,
  clampLng,
} from "@/lib/security";

describe("security: rateLimit", () => {
  test("allows first request", () => {
    const r = rateLimit("test-ip-1");
    expect(r.ok).toBe(true);
  });

  test("blocks after exhausting tokens", () => {
    const ip = "test-ip-burst";
    // Exhaust the bucket (capacity 60)
    for (let i = 0; i < 60; i++) {
      rateLimit(ip, 1);
    }
    const r = rateLimit(ip, 1);
    expect(r.ok).toBe(false);
    expect(r.retryAfterMs).toBeGreaterThan(0);
  });

  test("different IPs are independent", () => {
    const a = "ip-a";
    const b = "ip-b";
    for (let i = 0; i < 60; i++) rateLimit(a, 1);
    expect(rateLimit(a).ok).toBe(false);
    expect(rateLimit(b).ok).toBe(true);
  });
});

describe("security: getClientIp", () => {
  test("reads x-forwarded-for", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(req as unknown as import("next/server").NextRequest)).toBe("1.2.3.4");
  });

  test("reads x-real-ip fallback", () => {
    const req = new Request("https://example.com", {
      headers: { "x-real-ip": "9.9.9.9" },
    });
    expect(getClientIp(req as unknown as import("next/server").NextRequest)).toBe("9.9.9.9");
  });

  test("returns unknown when no headers", () => {
    const req = new Request("https://example.com");
    expect(getClientIp(req as unknown as import("next/server").NextRequest)).toBe("unknown");
  });
});

describe("security: sanitizeText", () => {
  test("strips control characters", () => {
    expect(sanitizeText("hello\u0000world\u0001")).toBe("helloworld");
  });

  test("trims whitespace", () => {
    expect(sanitizeText("  hello  ")).toBe("hello");
  });

  test("truncates to max length", () => {
    expect(sanitizeText("abcdefghij", 5)).toBe("abcde");
  });

  test("non-string input → empty string", () => {
    expect(sanitizeText(123)).toBe("");
    expect(sanitizeText(null)).toBe("");
    expect(sanitizeText(undefined)).toBe("");
    expect(sanitizeText({})).toBe("");
  });
});

describe("security: clampLat", () => {
  test("valid lat passes through", () => {
    expect(clampLat(12.97)).toBe(12.97);
  });

  test("out-of-range lat → null", () => {
    expect(clampLat(91)).toBeNull();
    expect(clampLat(-91)).toBeNull();
  });

  test("string input parsed", () => {
    expect(clampLat("12.97")).toBe(12.97);
  });

  test("invalid string → null", () => {
    expect(clampLat("abc")).toBeNull();
  });
});

describe("security: clampLng", () => {
  test("valid lng passes through", () => {
    expect(clampLng(77.64)).toBe(77.64);
  });

  test("out-of-range lng → null", () => {
    expect(clampLng(181)).toBeNull();
    expect(clampLng(-181)).toBeNull();
  });

  test("boundary values accepted", () => {
    expect(clampLng(180)).toBe(180);
    expect(clampLng(-180)).toBe(-180);
  });
});
