import { NextResponse } from "next/server";

import {
  assertValidationAccess,
  getSatEntitlements,
  incrementValidationUsage,
} from "@/lib/sat/billing";
import { getAuthenticatedUser } from "@/lib/supabase/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, code: "AUTH_REQUIRED", error: "Autenticación requerida." },
        { status: 401 },
      );
    }

    const supabase = createSupabaseServerClient();
    const access = await assertValidationAccess(supabase, user.id, "xml_fix");

    if (!access.allowed) {
      return NextResponse.json(
        {
          ok: false,
          code: access.code,
          error: access.message,
          entitlements: access.entitlements,
        },
        { status: access.code === "FREE_LIMIT_REACHED" ? 429 : 403 },
      );
    }

    await incrementValidationUsage(supabase, user.id, "xml_fix");
    const entitlements = await getSatEntitlements(supabase, user.id);

    return NextResponse.json({
      ok: true,
      data: { entitlements },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
