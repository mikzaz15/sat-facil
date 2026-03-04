-- Stripe deposit checkout support for Accepto.
-- Safe alters for quotes + payments tables.

-- Quotes: ensure lifecycle fields for acceptance and deposit payment exist.
alter table public.quotes
  add column if not exists accepted_at timestamp with time zone;

alter table public.quotes
  add column if not exists paid_at timestamp with time zone;

alter table public.quotes
  alter column status set default 'draft';

alter table public.quotes
  alter column status set not null;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'quotes_status_check'
      and conrelid = 'public.quotes'::regclass
  ) then
    alter table public.quotes drop constraint quotes_status_check;
  end if;
end $$;

alter table public.quotes
  add constraint quotes_status_check
  check (status in ('draft', 'sent', 'accepted', 'deposit_paid', 'paid'));

create unique index if not exists idx_quotes_token_unique on public.quotes(token);

-- Payments: normalize columns required for Stripe checkout + webhook tracking.
alter table public.payments
  add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;

alter table public.payments
  add column if not exists stripe_session_id text;

alter table public.payments
  add column if not exists amount_cents integer;

alter table public.payments
  add column if not exists currency text;

alter table public.payments
  add column if not exists paid_at timestamp with time zone;

alter table public.payments
  alter column status set default 'pending';

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'payments_status_check'
      and conrelid = 'public.payments'::regclass
  ) then
    alter table public.payments drop constraint payments_status_check;
  end if;
end $$;

alter table public.payments
  add constraint payments_status_check
  check (status in ('pending', 'paid', 'failed'));

create unique index if not exists idx_payments_stripe_session_id
  on public.payments(stripe_session_id)
  where stripe_session_id is not null;

create index if not exists idx_payments_workspace_id on public.payments(workspace_id);
create index if not exists idx_payments_quote_id on public.payments(quote_id);
