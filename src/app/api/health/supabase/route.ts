import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const missingVars: string[] = [];

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    missingVars.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    missingVars.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  if (missingVars.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: `Missing env var(s): ${missingVars.join(", ")}`,
      },
      { status: 500 },
    );
  }

  try {
    const supabase = createSupabaseServerClient();

    // Service role validation call against Supabase Auth admin API.
    const { error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Supabase error";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
