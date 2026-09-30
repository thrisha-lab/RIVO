/**
 * Lightweight in-memory rate limiter (token bucket per IP).
 * Production note: swap for Redis in a multi-instance deployment.
 */

interface Bucket {
  tokens: number;
  last: number;
}

const buckets = new Map<string, Bucket>();
const CAPACITY = 60; // tokens
const REFILL_PER_SEC = 1; // 1 req/sec sustained

export function rateLimit(ip: string, cost = 1): { ok: boolean; retryAfterMs: number } {
  const now = Date.now();
  let b = buckets.get(ip);
  if (!b) {
    b = { tokens: CAPACITY, last: now };
    buckets.set(ip, b);
  }
  const elapsed = (now - b.last) / 1000;
  b.tokens = Math.min(CAPACITY, b.tokens + elapsed * REFILL_PER_SEC);
  b.last = now;
  if (b.tokens < cost) {
    const need = cost - b.tokens;
    return { ok: false, retryAfterMs: Math.ceil((need / REFILL_PER_SEC) * 1000) };
  }
  b.tokens -= cost;
  return { ok: true, retryAfterMs: 0 };
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

/** Sanitize free text: strip control chars, cap length. */
export function sanitizeText(input: unknown, maxLen = 500): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLen);
}

export function clampLat(n: unknown): number | null {
  const v = typeof n === "string" ? parseFloat(n) : typeof n === "number" ? n : NaN;
  if (Number.isNaN(v)) return null;
  if (v < -90 || v > 90) return null;
  return v;
}

export function clampLng(n: unknown): number | null {
  const v = typeof n === "string" ? parseFloat(n) : typeof n === "number" ? n : NaN;
  if (Number.isNaN(v)) return null;
  if (v < -180 || v > 180) return null;
  return v;
}
