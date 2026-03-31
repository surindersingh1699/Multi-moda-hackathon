import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { beforeImageUrl, afterImageUrl, styleDirection, totalCost, itemCount, analysisId } =
    await request.json();

  if (!afterImageUrl) {
    return NextResponse.json({ error: "afterImageUrl required" }, { status: 400 });
  }

  try {
    // Fetch the after image and create a share entry
    // For now, use the styled image URL directly as the share image
    // In production, you could composite before/after with Sharp
    const shareId = crypto.randomUUID().slice(0, 16);
    const title = `My Room Makeover — ${styleDirection?.slice(0, 50) || "Roomify"}`;

    const { data: share, error: insertErr } = await supabase
      .from("shares")
      .insert({
        analysis_id: analysisId || null,
        user_id: user.id,
        image_path: afterImageUrl,
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
      imageUrl: afterImageUrl,
      title,
    });
  } catch (e) {
    console.error("Share image error:", e);
    return NextResponse.json({ error: "Failed to create share" }, { status: 500 });
  }
}
