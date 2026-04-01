import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

const MAX_BYTES = 6 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const buf = Buffer.from(await req.arrayBuffer());
    if (buf.length > MAX_BYTES) {
      return NextResponse.json({ error: "File too large" }, { status: 413 });
    }

    const jpeg = await sharp(buf)
      .jpeg({ quality: 90 })
      .toBuffer();

    return new NextResponse(new Uint8Array(jpeg), {
      headers: { "Content-Type": "image/jpeg" },
    });
  } catch (e) {
    console.error("HEIC conversion error:", e);
    return NextResponse.json(
      { error: "Failed to convert image" },
      { status: 500 }
    );
  }
}
