import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Only refresh Supabase session for API routes and auth callbacks.
  // Page navigations (GET /) don't need server-side session refresh —
  // the client-side AuthProvider handles that via onAuthStateChange.
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/") || pathname.startsWith("/auth/")) {
    return await updateSession(request);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
