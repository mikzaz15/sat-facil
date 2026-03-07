import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeServerClient } from "@/lib/stripe";

type CheckoutPayload = {
  token?: string;
};

function baseUrlFromRequest(request: Request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function asNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return NaN;
}

export async function POST(request: Request) {
  let payload: CheckoutPayload;
  try {
    payload = (await request.json()) as CheckoutPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "El cuerpo JSON es inválido." },
      { status: 400 },
    );
  }

  const token = typeof payload.token === "string" ? payload.token.trim() : "";
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Falta el token." },
      { status: 400 },
    );
  }

  const supabase = createSupabaseServerClient();
  const stripe = getStripeServerClient();
  const baseUrl = baseUrlFromRequest(request);

  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .select("id, workspace_id, status, total, deposit_percent")
    .eq("token", token)
    .limit(1)
    .maybeSingle();

  if (quoteError) {
    return NextResponse.json(
      { ok: false, error: quoteError.message },
      { status: 500 },
    );
  }

  if (!quote) {
    return NextResponse.json(
      { ok: false, error: "Cotización no encontrada." },
      { status: 404 },
    );
  }

  if (quote.status !== "accepted") {
    return NextResponse.json(
      { ok: false, error: "La cotización no está lista para pagar anticipo." },
      { status: 400 },
    );
  }

  const total = asNumber(quote.total);
  const depositPercent = asNumber(quote.deposit_percent) || 0;
  if (!Number.isFinite(total) || total <= 0) {
    return NextResponse.json(
      { ok: false, error: "El total de la cotización es inválido." },
      { status: 400 },
    );
  }

  const amountCents = Math.round(total * (depositPercent / 100) * 100);
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return NextResponse.json(
      { ok: false, error: "El monto del anticipo debe ser mayor a cero." },
      { status: 400 },
    );
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: `${baseUrl}/q/${encodeURIComponent(token)}?paid=1`,
    cancel_url: `${baseUrl}/q/${encodeURIComponent(token)}?canceled=1`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: {
            name: "Anticipo de cotización",
          },
        },
      },
    ],
    metadata: {
      quote_id: quote.id,
      workspace_id: quote.workspace_id,
      token,
      payment_type: "deposit",
    },
  });

  const { error: paymentError } = await supabase.from("payments").insert({
    workspace_id: quote.workspace_id,
    quote_id: quote.id,
    stripe_session_id: session.id,
    amount_cents: amountCents,
    currency: "usd",
    status: "pending",
  });

  if (paymentError) {
    return NextResponse.json(
      { ok: false, error: paymentError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    url: session.url,
  });
}
