import type { NextRequest } from "next/server";
import { refreshSession } from "@/lib/supabase/proxy";

// Session refresh only. No redirects and no authorization here.
export async function proxy(request: NextRequest) {
  return refreshSession(request);
}

export const config = {
  matcher: [
    // Every path except static files and images.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
