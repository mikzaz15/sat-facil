import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeServerClient } from "@/lib/stripe";

type StripeIdValue = string | { id: string } | null | undefined;

function stringId(value: StripeIdValue): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.id;
}

function satPlanFromSubscriptionStatus(status: string): "free" | "pro" {
  const normalized = status.toLowerCase();
  if (
    normalized === "active" ||
    normalized === "trialing" ||
    normalized === "past_due"
  ) {
    return "pro";
  }
  return "free";
}

async function resolveSatUserIdFromSubscription(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  subscriptionId: string,
  customerId: string,
  fallbackUserId: string,
): Promise<string> {
  if (fallbackUserId) return fallbackUserId;

  if (subscriptionId) {
    const bySubscription = await supabase
      .from("sat_subscriptions")
      .select("user_id")
      .eq("stripe_subscription_id", subscriptionId)
      .maybeSingle();

    if (!bySubscription.error && bySubscription.data?.user_id) {
      return bySubscription.data.user_id as string;
    }
  }

  if (customerId) {
    const byCustomer = await supabase
      .from("sat_subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();

    if (!byCustomer.error && byCustomer.data?.user_id) {
      return byCustomer.data.user_id as string;
    }
  }

  return "";
}

async function upsertSatSubscriptionState(params: {
  supabase: ReturnType<typeof createSupabaseServerClient>;
  userId: string;
  customerId: string;
  subscriptionId: string;
  status: string;
  priceId: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}) {
  if (!params.userId) return;

  const { error } = await params.supabase.from("sat_subscriptions").upsert(
    {
      user_id: params.userId,
      plan: satPlanFromSubscriptionStatus(params.status),
      status: params.status,
      stripe_customer_id: params.customerId || null,
      stripe_subscription_id: params.subscriptionId || null,
      stripe_price_id: params.priceId || null,
      current_period_end: params.currentPeriodEnd,
      cancel_at_period_end: params.cancelAtPeriodEnd,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw new Error(`Could not update SAT subscription: ${error.message}`);
  }
}

async function handleDepositCheckoutCompleted(params: {
  supabase: ReturnType<typeof createSupabaseServerClient>;
  sessionId: string;
}) {
  const { data: payment, error: paymentLookupError } = await params.supabase
    .from("payments")
    .select("id, quote_id, status")
    .eq("stripe_session_id", params.sessionId)
    .limit(1)
    .maybeSingle();

  if (paymentLookupError) {
    throw new Error(paymentLookupError.message);
  }

  if (!payment) {
    throw new Error("Payment row not found for session.");
  }

  if (payment.status === "paid") {
    return;
  }

  const nowIso = new Date().toISOString();

  const { error: paymentUpdateError } = await params.supabase
    .from("payments")
    .update({
      status: "paid",
      paid_at: nowIso,
    })
    .eq("id", payment.id);

  if (paymentUpdateError) {
    throw new Error(paymentUpdateError.message);
  }

  const { error: quoteUpdateError } = await params.supabase
    .from("quotes")
    .update({
      status: "deposit_paid",
      paid_at: nowIso,
    })
    .eq("id", payment.quote_id)
    .in("status", ["accepted", "deposit_paid"]);

  if (quoteUpdateError) {
    throw new Error(quoteUpdateError.message);
  }
}

async function handleSatSubscriptionCheckoutCompleted(params: {
  supabase: ReturnType<typeof createSupabaseServerClient>;
  stripe: Stripe;
  session: Stripe.Checkout.Session;
}) {
  const subscriptionId = stringId(params.session.subscription);
  if (!subscriptionId) return;

  const customerId = stringId(params.session.customer);
  const candidateUserId =
    (params.session.metadata?.sat_user_id ?? params.session.client_reference_id ?? "").trim();

  const subscription = await params.stripe.subscriptions.retrieve(subscriptionId);
  const subscriptionData = subscription as unknown as Stripe.Subscription;
  const userId = await resolveSatUserIdFromSubscription(
    params.supabase,
    subscriptionId,
    customerId,
    candidateUserId,
  );
  const periodEnd = subscriptionData.items.data[0]?.current_period_end ?? null;

  await upsertSatSubscriptionState({
    supabase: params.supabase,
    userId,
    customerId,
    subscriptionId,
    status: subscriptionData.status,
    priceId: subscriptionData.items.data[0]?.price?.id ?? "",
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancelAtPeriodEnd: Boolean(subscriptionData.cancel_at_period_end),
  });
}

async function handleSubscriptionStateChange(params: {
  supabase: ReturnType<typeof createSupabaseServerClient>;
  subscription: Stripe.Subscription;
}) {
  const subscriptionId = params.subscription.id;
  const customerId = stringId(params.subscription.customer);
  const candidateUserId = (params.subscription.metadata?.sat_user_id ?? "").trim();
  const userId = await resolveSatUserIdFromSubscription(
    params.supabase,
    subscriptionId,
    customerId,
    candidateUserId,
  );

  await upsertSatSubscriptionState({
    supabase: params.supabase,
    userId,
    customerId,
    subscriptionId,
    status: params.subscription.status,
    priceId: params.subscription.items.data[0]?.price?.id ?? "",
    currentPeriodEnd: params.subscription.items.data[0]?.current_period_end
      ? new Date(
          params.subscription.items.data[0].current_period_end * 1000,
        ).toISOString()
      : null,
    cancelAtPeriodEnd: Boolean(params.subscription.cancel_at_period_end),
  });
}

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

  const supabase = createSupabaseServerClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    try {
      if (session.mode === "subscription") {
        await handleSatSubscriptionCheckoutCompleted({
          supabase,
          stripe,
          session,
        });
      } else if (session.mode === "payment") {
        await handleDepositCheckoutCompleted({
          supabase,
          sessionId: session.id,
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Webhook error";
      return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    try {
      await handleSubscriptionStateChange({
        supabase,
        subscription: event.data.object as Stripe.Subscription,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Webhook error";
      return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
