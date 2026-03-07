-- SAT Facil subscription + usage controls.
-- Free: 5 validations/day
-- Pro: unlimited validations + XML validator + SAT AI assistant

create table if not exists public.sat_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  status text not null default 'inactive',
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.sat_usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  validations_count integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  primary key (user_id, usage_date)
);

create index if not exists idx_sat_usage_daily_usage_date
  on public.sat_usage_daily (usage_date desc);

create or replace function public.sat_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_sat_subscriptions_updated_at on public.sat_subscriptions;
create trigger trg_sat_subscriptions_updated_at
before update on public.sat_subscriptions
for each row execute function public.sat_set_updated_at();

drop trigger if exists trg_sat_usage_daily_updated_at on public.sat_usage_daily;
create trigger trg_sat_usage_daily_updated_at
before update on public.sat_usage_daily
for each row execute function public.sat_set_updated_at();

alter table public.sat_subscriptions enable row level security;
alter table public.sat_usage_daily enable row level security;

drop policy if exists "sat_subscriptions_select_own" on public.sat_subscriptions;
create policy "sat_subscriptions_select_own"
on public.sat_subscriptions
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "sat_usage_daily_select_own" on public.sat_usage_daily;
create policy "sat_usage_daily_select_own"
on public.sat_usage_daily
for select
to authenticated
using (user_id = auth.uid());
