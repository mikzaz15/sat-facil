import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeServerClient } from "@/lib/stripe";

export const runtime = "nodejs";

type StripeIdValue = string | { id: string } | null | undefined;

function isDuplicateKeyError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  return code === "23505";
}

async function hasProcessedWebhookEvent(params: {
  supabase: ReturnType<typeof createSupabaseServerClient>;
  eventId: string;
}): Promise<boolean> {
  const { data, error } = await params.supabase
    .from("stripe_webhook_events")
    .select("event_id")
    .eq("event_id", params.eventId)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not check webhook idempotency: ${error.message}`);
  }

  return Boolean(data?.event_id);
}

async function markWebhookEventProcessed(params: {
  supabase: ReturnType<typeof createSupabaseServerClient>;
  eventId: string;
}): Promise<"inserted" | "already_processed"> {
  const { error } = await params.supabase.from("stripe_webhook_events").insert({
    event_id: params.eventId,
  });

  if (!error) {
    return "inserted";
  }

  if (isDuplicateKeyError(error)) {
    return "already_processed";
  }

  throw new Error(`Could not persist webhook idempotency marker: ${error.message}`);
}

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

function asTrimmedString(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function satUserIdFromStripeCustomer(customer: Stripe.Customer | Stripe.DeletedCustomer): string {
  if ("deleted" in customer && customer.deleted) return "";
  return asTrimmedString(customer.metadata?.sat_user_id);
}

async function satUserIdFromCustomerMetadata(
  stripe: Stripe,
  customerId: string,
): Promise<string> {
  if (!customerId) return "";
  try {
    const customer = await stripe.customers.retrieve(customerId);
    return satUserIdFromStripeCustomer(customer);
  } catch {
    return "";
  }
}

async function resolveSatUserIdFromSubscription(params: {
  supabase: ReturnType<typeof createSupabaseServerClient>;
  stripe: Stripe;
  subscriptionId: string;
  customerId: string;
  fallbackUserId: string;
}): Promise<string> {
  const directFallback = asTrimmedString(params.fallbackUserId);
  if (directFallback) return directFallback;

  if (params.subscriptionId) {
    const bySubscription = await params.supabase
      .from("sat_subscriptions")
      .select("user_id")
      .eq("stripe_subscription_id", params.subscriptionId)
      .maybeSingle();

    if (!bySubscription.error && bySubscription.data?.user_id) {
      return bySubscription.data.user_id as string;
    }
  }

  if (params.customerId) {
    const byCustomer = await params.supabase
      .from("sat_subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", params.customerId)
      .maybeSingle();

    if (!byCustomer.error && byCustomer.data?.user_id) {
      return byCustomer.data.user_id as string;
    }
  }

  const fromCustomerMetadata = await satUserIdFromCustomerMetadata(
    params.stripe,
    params.customerId,
  );
  if (fromCustomerMetadata) return fromCustomerMetadata;

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
  if (!params.userId) {
    console.warn(
      `[SAT][STRIPE] Could not resolve user_id for subscription ${params.subscriptionId || "(none)"} customer ${params.customerId || "(none)"}`,
    );
    return;
  }

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
  const userId = await resolveSatUserIdFromSubscription({
    supabase: params.supabase,
    stripe: params.stripe,
    subscriptionId,
    customerId,
    fallbackUserId: candidateUserId,
  });
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
  stripe: Stripe;
  subscription: Stripe.Subscription;
}) {
  const subscriptionId = params.subscription.id;
  const customerId = stringId(params.subscription.customer);
  const candidateUserId = asTrimmedString(params.subscription.metadata?.sat_user_id);
  const userId = await resolveSatUserIdFromSubscription({
    supabase: params.supabase,
    stripe: params.stripe,
    subscriptionId,
    customerId,
    fallbackUserId: candidateUserId,
  });

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

async function handleInvoiceSubscriptionEvent(params: {
  supabase: ReturnType<typeof createSupabaseServerClient>;
  stripe: Stripe;
  invoice: Stripe.Invoice;
}) {
  const subscriptionId = stringId(
    (params.invoice as unknown as { subscription?: StripeIdValue }).subscription,
  );
  if (!subscriptionId) return;
  const subscription = await params.stripe.subscriptions.retrieve(subscriptionId);
  await handleSubscriptionStateChange({
    supabase: params.supabase,
    stripe: params.stripe,
    subscription: subscription as unknown as Stripe.Subscription,
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
  const eventId = event.id?.trim();
  if (!eventId) {
    return NextResponse.json(
      { ok: false, error: "Missing Stripe event id." },
      { status: 400 },
    );
  }

  try {
    const alreadyProcessed = await hasProcessedWebhookEvent({
      supabase,
      eventId,
    });
    if (alreadyProcessed) {
      return NextResponse.json({ received: true, already_processed: true });
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Webhook idempotency check error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
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
        stripe,
        subscription: event.data.object as Stripe.Subscription,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Webhook error";
      return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
  }

  if (
    event.type === "invoice.payment_succeeded" ||
    event.type === "invoice.payment_failed"
  ) {
    try {
      await handleInvoiceSubscriptionEvent({
        supabase,
        stripe,
        invoice: event.data.object as Stripe.Invoice,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Webhook error";
      return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
  }

  try {
    await markWebhookEventProcessed({
      supabase,
      eventId,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Webhook idempotency persistence error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
