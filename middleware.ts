import { type NextRequest } from "next/server";

import { protectAppRoutes } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return protectAppRoutes(request);
}

export const config = {
  matcher: ["/app/:path*"],
};
