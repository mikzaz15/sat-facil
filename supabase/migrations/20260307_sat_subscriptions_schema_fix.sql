-- Align sat_subscriptions with SAT Facil Stripe billing/webhook code paths.
-- This migration is safe to run on environments where sat_subscriptions
-- already exists with a partial/older schema.

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

alter table public.sat_subscriptions
  add column if not exists user_id uuid,
  add column if not exists plan text,
  add column if not exists status text,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_price_id text,
  add column if not exists current_period_end timestamp with time zone,
  add column if not exists cancel_at_period_end boolean,
  add column if not exists created_at timestamp with time zone,
  add column if not exists updated_at timestamp with time zone;

update public.sat_subscriptions
set
  plan = case
    when lower(coalesce(nullif(plan, ''), 'free')) = 'pro' then 'pro'
    else 'free'
  end,
  status = coalesce(nullif(status, ''), 'inactive'),
  cancel_at_period_end = coalesce(cancel_at_period_end, false),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

with ranked as (
  select
    ctid,
    user_id,
    row_number() over (
      partition by user_id
      order by updated_at desc nulls last, created_at desc nulls last, ctid desc
    ) as rn
  from public.sat_subscriptions
)
delete from public.sat_subscriptions s
using ranked r
where s.ctid = r.ctid
  and (r.user_id is null or r.rn > 1);

with ranked_customer as (
  select
    ctid,
    row_number() over (
      partition by stripe_customer_id
      order by updated_at desc nulls last, created_at desc nulls last, ctid desc
    ) as rn
  from public.sat_subscriptions
  where stripe_customer_id is not null
)
update public.sat_subscriptions s
set stripe_customer_id = null
from ranked_customer r
where s.ctid = r.ctid
  and r.rn > 1;

with ranked_subscription as (
  select
    ctid,
    row_number() over (
      partition by stripe_subscription_id
      order by updated_at desc nulls last, created_at desc nulls last, ctid desc
    ) as rn
  from public.sat_subscriptions
  where stripe_subscription_id is not null
)
update public.sat_subscriptions s
set stripe_subscription_id = null
from ranked_subscription r
where s.ctid = r.ctid
  and r.rn > 1;

alter table public.sat_subscriptions
  alter column plan set default 'free',
  alter column status set default 'inactive',
  alter column cancel_at_period_end set default false,
  alter column created_at set default now(),
  alter column updated_at set default now();

alter table public.sat_subscriptions
  alter column plan set not null,
  alter column status set not null,
  alter column cancel_at_period_end set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.sat_subscriptions'::regclass
      and contype = 'p'
  ) then
    alter table public.sat_subscriptions
      add constraint sat_subscriptions_pkey primary key (user_id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'sat_subscriptions'
      and indexdef ilike 'create unique index%(%user_id%)'
  ) then
    execute 'create unique index idx_sat_subscriptions_user_id on public.sat_subscriptions (user_id)';
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sat_subscriptions_user_id_fkey'
      and conrelid = 'public.sat_subscriptions'::regclass
  ) then
    alter table public.sat_subscriptions
      add constraint sat_subscriptions_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'sat_subscriptions_plan_check'
      and conrelid = 'public.sat_subscriptions'::regclass
  ) then
    alter table public.sat_subscriptions
      drop constraint sat_subscriptions_plan_check;
  end if;

  alter table public.sat_subscriptions
    add constraint sat_subscriptions_plan_check
    check (plan in ('free', 'pro'));
end;
$$;

create unique index if not exists idx_sat_subscriptions_stripe_customer_id
  on public.sat_subscriptions (stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists idx_sat_subscriptions_stripe_subscription_id
  on public.sat_subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;

create index if not exists idx_sat_subscriptions_plan_status
  on public.sat_subscriptions (plan, status);

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

alter table public.sat_subscriptions enable row level security;

drop policy if exists "sat_subscriptions_select_own" on public.sat_subscriptions;
create policy "sat_subscriptions_select_own"
on public.sat_subscriptions
for select
to authenticated
using (user_id = auth.uid());
