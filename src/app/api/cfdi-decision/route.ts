import { NextResponse } from "next/server";

import {
  buildCfdiDecisionRecommendation,
  type CfdiDecisionInput,
} from "@/lib/sat/rules";

function asOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseBody(input: unknown): CfdiDecisionInput {
  const body = (input ?? {}) as Record<string, unknown>;

  const saleDate = asOptionalString(body.sale_date);
  if (!saleDate) {
    throw new Error("sale_date es obligatorio");
  }

  const paymentDate = asOptionalString(body.payment_date);
  const partialPayment =
    typeof body.partial_payment === "boolean" ? body.partial_payment : false;
  const foreignClient =
    typeof body.foreign_client === "boolean" ? body.foreign_client : false;
  const amount =
    typeof body.amount === "number" && Number.isFinite(body.amount)
      ? body.amount
      : undefined;
  const currency = asOptionalString(body.currency) ?? "MXN";

  return {
    sale_date: saleDate,
    payment_date: paymentDate,
    partial_payment: partialPayment,
    foreign_client: foreignClient,
    amount,
    currency,
  };
}

export async function POST(request: Request) {
  try {
    const body = parseBody(await request.json());
    const recommendation = buildCfdiDecisionRecommendation(body);

    return NextResponse.json({
      ok: true,
      data: {
        input: body,
        recommendation,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    const isValidationError = /required|YYYY-MM-DD/i.test(message);
    return NextResponse.json(
      { ok: false, error: message },
      { status: isValidationError ? 400 : 500 },
    );
  }
}
