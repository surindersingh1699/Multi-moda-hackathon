import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export async function GET(req: NextRequest) {
  // Rate limit: 30 requests per minute per IP
  const rl = rateLimit(req, { maxRequests: 30, windowMs: 60_000 });
  if (rl) return rl;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ isAdmin: false });
  }

  const isAdmin = ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? "");
  return NextResponse.json({ isAdmin });
}
