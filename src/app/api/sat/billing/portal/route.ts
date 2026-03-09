import { NextResponse } from "next/server";

import { getStripeServerClient } from "@/lib/stripe";
import { getAuthenticatedUser } from "@/lib/supabase/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getPortalReturnUrl(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    return `${configured.replace(/\/+$/, "")}/cuenta`;
  }

  const requestUrl = new URL(request.url);
  if (
    requestUrl.hostname === "localhost" ||
    requestUrl.hostname === "127.0.0.1"
  ) {
    return `${requestUrl.protocol}//${requestUrl.host}/cuenta`;
  }

  return "https://www.satfacil.com.mx/cuenta";
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Autenticación requerida." },
        { status: 401 },
      );
    }

    const supabase = createSupabaseServerClient();
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

    const customerId = (subscriptionLookup.data?.stripe_customer_id ?? "").trim();
    if (!customerId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No hay una suscripción de Stripe asociada a esta cuenta para administrar.",
        },
        { status: 400 },
      );
    }

    const stripe = getStripeServerClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: getPortalReturnUrl(request),
    });

    return NextResponse.redirect(session.url, { status: 303 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
