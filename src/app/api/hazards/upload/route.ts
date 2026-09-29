import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveRider } from "@/lib/auth";
import { rateLimit, getClientIp, sanitizeText } from "@/lib/security";
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const runtime = "nodejs";

const UPLOAD_DIR = "/home/z/my-project/download/hazards";
const MAX_BYTES = 4 * 1024 * 1024; // 4MB
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/** POST /api/hazards/upload — multipart upload, returns saved image path. */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, 5);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "Too many requests." }, { status: 429 });
  }

  const rider = await resolveRider();
  if (!rider) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  const form = await req.formData();
  const file = form.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "No image provided." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ ok: false, error: "Empty file." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "Image too large (max 4MB)." }, { status: 413 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { ok: false, error: "Unsupported type. Use JPEG, PNG, WebP, or GIF." },
      { status: 415 },
    );
  }

  if (!existsSync(UPLOAD_DIR)) await mkdir(UPLOAD_DIR, { recursive: true });

  const buf = Buffer.from(await file.arrayBuffer());
  const hash = crypto.createHash("sha256").update(buf).digest("hex").slice(0, 16);
  const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
  const filename = `${rider.id.slice(-8)}-${Date.now().toString(36)}-${hash}.${ext}`;
  const fullPath = path.join(UPLOAD_DIR, filename);
  await writeFile(fullPath, buf);

  // The client references the image via the streaming endpoint.
  const imageUrl = `/api/hazards/image/${filename}`;
  return NextResponse.json({
    ok: true,
    data: { imageUrl, filename, size: buf.length, contentType: file.type },
  });
}

// Helper used elsewhere to sanitize any caption (not currently used but exported
// for future caption support).
export function sanitizeCaption(input: unknown): string {
  return sanitizeText(input, 200);
}
