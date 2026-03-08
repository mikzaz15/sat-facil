-- Validation history for SAT Facil XML validator dashboard.

create extension if not exists pgcrypto;

create table if not exists public.validation_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  result text not null check (result in ('OK', 'Error', 'Warning')),
  detected_errors jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_validation_history_user_created_at
  on public.validation_history (user_id, created_at desc);

create index if not exists idx_validation_history_created_at
  on public.validation_history (created_at desc);

alter table public.validation_history enable row level security;

drop policy if exists "validation_history_select_own" on public.validation_history;
create policy "validation_history_select_own"
on public.validation_history
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "validation_history_insert_own" on public.validation_history;
create policy "validation_history_insert_own"
on public.validation_history
for insert
to authenticated
with check (user_id = auth.uid());

grant select, insert on public.validation_history to authenticated;
