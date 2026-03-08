import { NextResponse } from "next/server";

import { createSupabaseServerAuthClient } from "@/lib/supabase/auth-server";

const DEFAULT_GOOGLE_REDIRECT = "/validate-cfdi";
const OAUTH_FAILED_REDIRECT = "/login?error=oauth_callback_failed";

function isSafeInternalPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//");
}

function safeNextPath(value: string | null): string {
  const nextPath = (value || "").trim();
  if (!nextPath) return DEFAULT_GOOGLE_REDIRECT;
  if (!isSafeInternalPath(nextPath)) return DEFAULT_GOOGLE_REDIRECT;
  if (nextPath === "/app" || nextPath.startsWith("/app/")) {
    return DEFAULT_GOOGLE_REDIRECT;
  }
  return nextPath;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextPath = safeNextPath(url.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL(OAUTH_FAILED_REDIRECT, url));
  }

  const supabase = await createSupabaseServerAuthClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL(OAUTH_FAILED_REDIRECT, url));
  }

  return NextResponse.redirect(new URL(nextPath, url));
}
