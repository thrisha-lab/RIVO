/** Consistent JSON API helpers. */
import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

export function unauthorized() {
  return fail("Unauthorized. No rider identity found.", 401);
}

export function rateLimited(retryAfterMs: number) {
  return NextResponse.json(
    { ok: false, error: "Too many requests. Slow down." },
    { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } },
  );
}
