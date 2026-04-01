import { NextRequest, NextResponse } from "next/server";
import convert from "heic-convert";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const MAX_BYTES = 6 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 15 requests per minute per IP
    const rl = rateLimit(req, { maxRequests: 15, windowMs: 60_000 });
    if (rl) return rl;

    // Auth check — prevent unauthenticated resource abuse
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Please sign in to convert images" },
        { status: 401 }
      );
    }

    const buf = Buffer.from(await req.arrayBuffer());
    if (buf.length > MAX_BYTES) {
      return NextResponse.json({ error: "File too large" }, { status: 413 });
    }

    const jpeg = await convert({ buffer: new Uint8Array(buf) as unknown as ArrayBuffer, format: "JPEG", quality: 0.9 });

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
