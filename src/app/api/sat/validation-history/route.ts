import { NextResponse } from "next/server";

import { listValidationHistory } from "@/lib/sat/validation-history";
import { getAuthenticatedUser } from "@/lib/supabase/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Autenticación requerida." },
        { status: 401 },
      );
    }

    const url = new URL(request.url);
    const rawLimit = Number(url.searchParams.get("limit") || "100");
    const limit = Number.isFinite(rawLimit)
      ? Math.max(1, Math.min(200, Math.floor(rawLimit)))
      : 100;

    const supabase = createSupabaseServerClient();
    const history = await listValidationHistory(supabase, user.id, limit);

    return NextResponse.json({ ok: true, data: history });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
