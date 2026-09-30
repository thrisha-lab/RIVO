import { NextRequest, NextResponse } from "next/server";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

const UPLOAD_DIR = "/home/z/my-project/download/hazards";

const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

/** GET /api/hazards/image/[filename] — streams an uploaded hazard image. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ filename: string }> }) {
  const { filename } = await ctx.params;

  // Strict filename validation: only allow safe chars to prevent path traversal.
  if (!/^[a-zA-Z0-9\-]+\.(jpg|jpeg|png|webp|gif)$/i.test(filename)) {
    return NextResponse.json({ ok: false, error: "Invalid filename." }, { status: 400 });
  }

  const fullPath = path.join(UPLOAD_DIR, filename);
  if (!existsSync(fullPath)) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  const buf = await readFile(fullPath);
  const ext = filename.split(".").pop()!.toLowerCase();
  const mime = EXT_MIME[ext] ?? "application/octet-stream";

  return new NextResponse(buf, {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "public, max-age=86400, immutable",
      "Content-Length": String(buf.length),
    },
  });
}
