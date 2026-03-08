-- Launch-ready reconciliation for validation_history used by /api/cfdi-validate and /historial.

create extension if not exists pgcrypto;

create table if not exists public.validation_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  file_name text,
  result text,
  detected_errors jsonb default '[]'::jsonb,
  created_at timestamp with time zone default now()
);

alter table public.validation_history
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists file_name text,
  add column if not exists result text,
  add column if not exists detected_errors jsonb default '[]'::jsonb,
  add column if not exists created_at timestamp with time zone default now();

update public.validation_history
set detected_errors = '[]'::jsonb
where detected_errors is null;

update public.validation_history
set created_at = now()
where created_at is null;

alter table public.validation_history
  alter column file_name set default 'cfdi.xml',
  alter column detected_errors set default '[]'::jsonb,
  alter column created_at set default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'validation_history_result_check'
      and conrelid = 'public.validation_history'::regclass
  ) then
    alter table public.validation_history
      add constraint validation_history_result_check
      check (result in ('OK', 'Error', 'Warning'));
  end if;
end
$$;

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
