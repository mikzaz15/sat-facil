import { NextResponse } from "next/server";

import { getSatEntitlements } from "@/lib/sat/billing";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/current-user";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Autenticación requerida." },
        { status: 401 },
      );
    }

    const supabase = createSupabaseServerClient();
    const entitlements = await getSatEntitlements(supabase, user.id);

    return NextResponse.json({ ok: true, data: entitlements });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
