-- Stripe webhook idempotency log.
-- Prevents duplicate processing when Stripe retries the same event.

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  processed_at timestamp with time zone not null default now()
);
