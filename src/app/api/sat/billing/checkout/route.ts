import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeServerClient } from "@/lib/stripe";
import { getAuthenticatedUser } from "@/lib/supabase/current-user";

function baseUrlFromRequest(request: Request): string {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Autenticación requerida." },
        { status: 401 },
      );
    }

    const priceId = process.env.STRIPE_PRICE_PRO_MONTHLY;
    if (!priceId) {
      return NextResponse.json(
        { ok: false, error: "Falta STRIPE_PRICE_PRO_MONTHLY." },
        { status: 500 },
      );
    }

    const supabase = createSupabaseServerClient();
    const stripe = getStripeServerClient();
    const baseUrl = baseUrlFromRequest(request);

    const subscriptionLookup = await supabase
      .from("sat_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subscriptionLookup.error) {
      return NextResponse.json(
        { ok: false, error: subscriptionLookup.error.message },
        { status: 500 },
      );
    }

    let customerId = (subscriptionLookup.data?.stripe_customer_id as string) || "";
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: {
          sat_user_id: user.id,
        },
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      client_reference_id: user.id,
      metadata: {
        sat_user_id: user.id,
      },
      subscription_data: {
        metadata: {
          sat_user_id: user.id,
        },
      },
      success_url: `${baseUrl}/validate-cfdi?billing=success`,
      cancel_url: `${baseUrl}/validate-cfdi?billing=cancel`,
    });

    const upsertResult = await supabase.from("sat_subscriptions").upsert(
      {
        user_id: user.id,
        plan: "free",
        status: "inactive",
        stripe_customer_id: customerId,
      },
      { onConflict: "user_id" },
    );

    if (upsertResult.error) {
      return NextResponse.json(
        { ok: false, error: upsertResult.error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        checkout_url: session.url,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
