import { NextResponse } from "next/server";

import { getStripeServerClient } from "@/lib/stripe";
import { getAuthenticatedUser } from "@/lib/supabase/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function toAbsoluteSiteUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return "";
    }
    return parsed.origin;
  } catch {
    return "";
  }
}

function getPortalReturnUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  const siteOrigin = configured ? toAbsoluteSiteUrl(configured) : "";
  const candidate = siteOrigin
    ? `${siteOrigin.replace(/\/+$/, "")}/cuenta`
    : "https://www.satfacil.com.mx/cuenta";

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error("invalid protocol");
    }
    return parsed.toString();
  } catch {
    throw new Error(
      "Invalid Stripe billing portal return URL. Set NEXT_PUBLIC_SITE_URL to a valid absolute URL.",
    );
  }
}

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
    const returnUrl = getPortalReturnUrl();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return NextResponse.redirect(session.url, { status: 303 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
