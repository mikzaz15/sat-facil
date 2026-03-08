import { NextResponse } from "next/server";

import { logValidationAnalyticsEvents } from "@/lib/sat/analytics";
import {
  assertValidationAccess,
  getSatEntitlements,
  incrementValidationUsage,
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

function parseBody(input: unknown): {
  validationInput: CfdiValidationInput;
  sourcePage: string;
  fileName?: string;
} {
  const body = (input ?? {}) as Record<string, unknown>;

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
    sourcePage: asOptionalString(body.source_page) ?? "/cfdi-xml-validator",
    fileName: asOptionalString(body.file_name),
  };
}

export async function POST(request: Request) {
  try {
    const { validationInput, sourcePage, fileName } = parseBody(
      await request.json(),
    );
    const user = await getAuthenticatedUser();

    if (!user) {
      const previewValidation = buildCfdiValidationResult(validationInput);
      return NextResponse.json({
        ok: true,
        data: {
          preview_mode: true,
          validation_summary: {
            status: previewValidation.is_valid ? "Válido" : "Inválido",
            errors_count: previewValidation.errors.length,
            warnings_count: previewValidation.warnings.length,
          },
        },
      });
    }

    const supabase = createSupabaseServerClient();
    const access = await assertValidationAccess(supabase, user.id, "xml");

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
      mode: "xml",
      sourcePage,
      validation: result,
    });

    await logValidationAnalyticsEvents({
      supabase,
      userId: user.id,
      sourcePage,
      mode: "xml",
      plan: access.entitlements.plan,
      validation: result,
    });

    await incrementValidationUsage(supabase, user.id, "xml");
    const entitlements = await getSatEntitlements(supabase, user.id);

    return NextResponse.json({
      ok: true,
      data: {
        preview_mode: false,
        validation: result,
        entitlements,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
