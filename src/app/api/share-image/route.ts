import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // Rate limit: 10 requests per minute per IP
  const rl = rateLimit(request, { maxRequests: 10, windowMs: 60_000 });
  if (rl) return rl;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { styleDirection, analysisId } = await request.json();

  if (!analysisId) {
    return NextResponse.json({ error: "analysisId required" }, { status: 400 });
  }

  try {
    // Fetch the analysis to get the styled image URL
    const { data: analysis, error: fetchErr } = await supabase
      .from("analyses")
      .select("styled_image_url")
      .eq("id", analysisId)
      .eq("user_id", user.id)
      .single();

    if (fetchErr || !analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    const imageUrl = analysis.styled_image_url;
    const title = `My Room Makeover — ${styleDirection?.slice(0, 50) || "Roomify"}`;

    const { data: share, error: insertErr } = await supabase
      .from("shares")
      .insert({
        analysis_id: analysisId,
        user_id: user.id,
        image_path: imageUrl,
        title,
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("Failed to create share:", insertErr);
      return NextResponse.json({ error: "Failed to create share" }, { status: 500 });
    }

    const shareUrl = `${new URL(request.url).origin}/share/${share.id}`;

    return NextResponse.json({
      shareId: share.id,
      shareUrl,
      imageUrl,
      title,
    });
  } catch (e) {
    console.error("Share image error:", e);
    return NextResponse.json({ error: "Failed to create share" }, { status: 500 });
  }
}
