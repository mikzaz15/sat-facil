-- Validation usage logs for SAT CFDI validator limits.
-- Source of truth for daily validation counting per user.

create extension if not exists pgcrypto;

create table if not exists public.validation_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  validation_mode text not null default 'manual' check (validation_mode in ('manual', 'xml')),
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_validation_logs_user_created_at
  on public.validation_logs (user_id, created_at desc);

create index if not exists idx_validation_logs_created_at
  on public.validation_logs (created_at desc);

alter table public.validation_logs enable row level security;

drop policy if exists "validation_logs_select_own" on public.validation_logs;
create policy "validation_logs_select_own"
on public.validation_logs
for select
to authenticated
using (user_id = auth.uid());
