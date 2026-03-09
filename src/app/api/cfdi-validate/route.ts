import { NextResponse } from "next/server";

import { logValidationAnalyticsEvents } from "@/lib/sat/analytics";
import {
  assertValidationAccess,
  getSatEntitlements,
  incrementValidationUsage,
  type SatValidationMode,
} from "@/lib/sat/billing";
import {
  buildCfdiValidationResult,
  type CfdiValidationInput,
} from "@/lib/sat/rules";
import { saveValidationHistory } from "@/lib/sat/validation-history";
import { getAuthenticatedUser } from "@/lib/supabase/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function asOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseMode(value: unknown): SatValidationMode {
  if (typeof value !== "string") return "manual";
  return value.trim().toLowerCase() === "xml" ? "xml" : "manual";
}

function parseBody(input: unknown): {
  validationInput: CfdiValidationInput;
  mode: SatValidationMode;
  sourcePage: string;
  fileName?: string;
} {
  const body = (input ?? {}) as Record<string, unknown>;
  const mode = parseMode(body.mode);

  return {
    validationInput: {
      tipo_comprobante: asOptionalString(body.tipo_comprobante),
      metodo_pago: asOptionalString(body.metodo_pago),
      forma_pago: asOptionalString(body.forma_pago),
      uso_cfdi: asOptionalString(body.uso_cfdi),
      regimen_fiscal: asOptionalString(body.regimen_fiscal),
      currency: asOptionalString(body.currency),
      payment_date: asOptionalString(body.payment_date) ?? null,
    },
    mode,
    sourcePage:
      asOptionalString(body.source_page) ??
      (mode === "xml" ? "/cfdi-xml-validator" : "/validate-cfdi"),
    fileName: asOptionalString(body.file_name),
  };
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, code: "AUTH_REQUIRED", error: "Autenticación requerida." },
        { status: 401 },
      );
    }

    const { validationInput, mode, sourcePage, fileName } = parseBody(
      await request.json(),
    );
    const supabase = createSupabaseServerClient();
    const access = await assertValidationAccess(supabase, user.id, mode);

    if (!access.allowed) {
      if (access.code === "FREE_LIMIT_REACHED") {
        return NextResponse.json(
          {
            ok: false,
            code: "FREE_LIMIT_REACHED",
            error: "free_limit_reached",
            message:
              "Has alcanzado el límite gratuito de validaciones hoy. Mejora a Pro para validaciones ilimitadas.",
            entitlements: access.entitlements,
          },
          { status: 429 },
        );
      }

      return NextResponse.json(
        {
          ok: false,
          code: access.code,
          error: access.message,
          entitlements: access.entitlements,
        },
        { status: 403 },
      );
    }

    const result = buildCfdiValidationResult(validationInput);
    await saveValidationHistory({
      supabase,
      userId: user.id,
      fileName,
      mode,
      sourcePage,
      validation: result,
    });

    try {
      await logValidationAnalyticsEvents({
        supabase,
        userId: user.id,
        sourcePage,
        mode,
        plan: access.entitlements.plan,
        validation: result,
      });
    } catch (analyticsError: unknown) {
      const message =
        analyticsError instanceof Error
          ? analyticsError.message
          : "unknown analytics error";
      console.error(
        `[SAT][ANALYTICS] Failed to log validation events: ${message}`,
      );
    }

    await incrementValidationUsage(supabase, user.id, mode);
    const entitlements = await getSatEntitlements(supabase, user.id);

    return NextResponse.json({
      ok: true,
      data: {
        input: validationInput,
        mode,
        entitlements,
        validation: result,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
