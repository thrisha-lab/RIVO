/**
 * Anonymous rider identity.
 *
 * No email/password. Each rider gets a single opaque secret token (kept in a
 * httpOnly cookie) and a public display name like "Rider-7F3A".
 * The token is SHA-256 hashed before storage; we never store the raw token.
 */
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const COOKIE_NAME = "rg_rider_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomSuffix(): string {
  const chars = "0123456789ABCDEF";
  let s = "";
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function getOrCreateRider(): Promise<{
  id: string;
  displayName: string;
  reputation: number;
  isNew: boolean;
}> {
  const store = await cookies();
  const existing = store.get(COOKIE_NAME)?.value;
  if (existing) {
    const tokenHash = await sha256(existing);
    const rider = await db.rider.findUnique({ where: { tokenHash } });
    if (rider) {
      await db.rider.update({
        where: { id: rider.id },
        data: { lastSeenAt: new Date() },
      });
      return {
        id: rider.id,
        displayName: rider.displayName,
        reputation: rider.reputation,
        isNew: false,
      };
    }
  }

  // Create a new anonymous rider.
  const rawToken = randomToken();
  const tokenHash = await sha256(rawToken);
  const displayName = `Rider-${randomSuffix()}`;
  const rider = await db.rider.create({
    data: { tokenHash, displayName },
  });
  store.set(COOKIE_NAME, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return {
    id: rider.id,
    displayName: rider.displayName,
    reputation: rider.reputation,
    isNew: true,
  };
}

/** Resolve rider from an explicit token (for API routes that read cookie). */
export async function resolveRider(): Promise<{
  id: string;
  displayName: string;
  reputation: number;
} | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const tokenHash = await sha256(token);
  const rider = await db.rider.findUnique({ where: { tokenHash } });
  if (!rider) return null;
  return {
    id: rider.id,
    displayName: rider.displayName,
    reputation: rider.reputation,
  };
}
