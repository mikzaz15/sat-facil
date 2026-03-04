import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeServerClient } from "@/lib/stripe";

export async function POST(request: Request) {
  const signature = (await headers()).get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { ok: false, error: "Missing Stripe webhook signature or secret." },
      { status: 400 },
    );
  }

  const stripe = getStripeServerClient();
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid webhook signature.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const sessionId = session.id;

    const supabase = createSupabaseServerClient();
    const { data: payment, error: paymentLookupError } = await supabase
      .from("payments")
      .select("id, quote_id, status")
      .eq("stripe_session_id", sessionId)
      .limit(1)
      .maybeSingle();

    if (paymentLookupError) {
      return NextResponse.json(
        { ok: false, error: paymentLookupError.message },
        { status: 500 },
      );
    }

    if (!payment) {
      return NextResponse.json(
        { ok: false, error: "Payment row not found for session." },
        { status: 404 },
      );
    }

    if (payment.status !== "paid") {
      const nowIso = new Date().toISOString();

      const { error: paymentUpdateError } = await supabase
        .from("payments")
        .update({
          status: "paid",
          paid_at: nowIso,
        })
        .eq("id", payment.id);

      if (paymentUpdateError) {
        return NextResponse.json(
          { ok: false, error: paymentUpdateError.message },
          { status: 500 },
        );
      }

      const { error: quoteUpdateError } = await supabase
        .from("quotes")
        .update({
          status: "deposit_paid",
          paid_at: nowIso,
        })
        .eq("id", payment.quote_id)
        .in("status", ["accepted", "deposit_paid"]);

      if (quoteUpdateError) {
        return NextResponse.json(
          { ok: false, error: quoteUpdateError.message },
          { status: 500 },
        );
      }
    }
  }

  return NextResponse.json({ received: true });
}
