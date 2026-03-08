-- Product analytics events for SAT Facil.

create extension if not exists pgcrypto;

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_name text not null check (
    event_name in (
      'validation_run',
      'validation_error_detected',
      'corrected_xml_downloaded',
      'batch_validation_run',
      'batch_corrected_zip_downloaded'
    )
  ),
  source_page text not null default '/unknown',
  mode text,
  error_code text,
  detected_rule text,
  file_count integer,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_analytics_events_user_created_at
  on public.analytics_events (user_id, created_at desc);

create index if not exists idx_analytics_events_event_created_at
  on public.analytics_events (event_name, created_at desc);

create index if not exists idx_analytics_events_error_code
  on public.analytics_events (error_code)
  where error_code is not null;

create index if not exists idx_analytics_events_detected_rule
  on public.analytics_events (detected_rule)
  where detected_rule is not null;

alter table public.analytics_events enable row level security;

drop policy if exists "analytics_events_select_own" on public.analytics_events;
create policy "analytics_events_select_own"
on public.analytics_events
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "analytics_events_insert_own" on public.analytics_events;
create policy "analytics_events_insert_own"
on public.analytics_events
for insert
to authenticated
with check (user_id = auth.uid());

grant select, insert on public.analytics_events to authenticated;
