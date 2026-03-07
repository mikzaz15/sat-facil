import { NextResponse } from "next/server";

import { explainCfdiError } from "@/lib/sat/error-explainer";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      error_code?: string;
      code?: string;
      context?: string;
    };

    const rawCode = (body.error_code ?? body.code ?? "").trim();
    const context = body.context?.trim() ?? "";
    const supabase = createSupabaseServerClient();
    const result = await explainCfdiError(supabase, rawCode, context);

    return NextResponse.json({
      ok: true,
      data: result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    const isValidationError = /required|format/i.test(message);
    return NextResponse.json(
      { ok: false, error: message },
      { status: isValidationError ? 400 : 500 },
    );
  }
}
