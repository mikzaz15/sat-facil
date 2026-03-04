import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getStripeServerClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  if (!stripe) {
    stripe = new Stripe(secretKey);
  }

  return stripe;
}
