import { NextResponse } from "next/server";
import { getOrCreateRider } from "@/lib/auth";
import { ok } from "@/lib/api";

export const runtime = "nodejs";

export async function GET() {
  const rider = await getOrCreateRider();
  const res = ok({
    id: rider.id,
    displayName: rider.displayName,
    reputation: rider.reputation,
    isNew: rider.isNew,
  });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
