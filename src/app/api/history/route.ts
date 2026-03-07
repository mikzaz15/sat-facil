import { NextResponse } from "next/server";

import { getSessionHistory } from "@/lib/sat/store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "user_id is required" },
        { status: 400 },
      );
    }

    const supabase = createSupabaseServerClient();
    const history = await getSessionHistory(supabase, userId, 10);

    return NextResponse.json({ ok: true, data: history });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
