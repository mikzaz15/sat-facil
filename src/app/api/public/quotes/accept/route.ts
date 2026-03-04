import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;

  const formData = await request.formData();
  const tokenValue = formData.get("token");
  const token = typeof tokenValue === "string" ? tokenValue.trim() : "";

  if (!token) {
    return NextResponse.redirect(new URL("/", baseUrl));
  }

  const supabase = createSupabaseServerClient();

  // Public accept: update only the quote identified by token and only from draft -> accepted.
  let { error } = await supabase
    .from("quotes")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
    })
    .eq("token", token)
    .eq("status", "draft");

  // Temporary compatibility path while accepted_at migration is pending.
  if (error?.message.includes("accepted_at")) {
    const fallbackResult = await supabase
      .from("quotes")
      .update({
        status: "accepted",
      })
      .eq("token", token)
      .eq("status", "draft");
    error = fallbackResult.error;
  }

  if (error) {
    const url = new URL(`/q/${encodeURIComponent(token)}`, baseUrl);
    url.searchParams.set("error", error.message);
    return NextResponse.redirect(url);
  }

  const url = new URL(`/q/${encodeURIComponent(token)}`, baseUrl);
  url.searchParams.set("accepted", "1");
  return NextResponse.redirect(url);
}
