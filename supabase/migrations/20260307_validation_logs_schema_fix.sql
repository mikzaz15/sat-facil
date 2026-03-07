-- Ensure validation_logs matches SAT validator usage (insert + daily count by user/date).

create extension if not exists pgcrypto;

create table if not exists public.validation_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  validation_mode text not null default 'manual' check (validation_mode in ('manual', 'xml')),
  created_at timestamp with time zone not null default now()
);

alter table public.validation_logs
  add column if not exists id uuid,
  add column if not exists user_id uuid,
  add column if not exists validation_mode text,
  add column if not exists created_at timestamp with time zone;

-- If an old "mode" column exists, migrate values into validation_mode.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'validation_logs'
      and column_name = 'mode'
  ) then
    execute $sql$
      update public.validation_logs
      set validation_mode = lower(mode::text)
      where validation_mode is null and mode is not null
    $sql$;
  end if;
end
$$;

update public.validation_logs
set id = gen_random_uuid()
where id is null;

alter table public.validation_logs
  alter column id set default gen_random_uuid(),
  alter column id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'validation_logs'
      and c.contype = 'p'
  ) then
    alter table public.validation_logs
      add constraint validation_logs_pkey primary key (id);
  end if;
end
$$;

update public.validation_logs
set validation_mode = 'manual'
where validation_mode is null or btrim(validation_mode) = '';

update public.validation_logs
set validation_mode = 'manual'
where lower(validation_mode) not in ('manual', 'xml');

alter table public.validation_logs
  alter column validation_mode set default 'manual',
  alter column validation_mode set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'validation_logs'
      and c.conname = 'validation_logs_validation_mode_check'
  ) then
    alter table public.validation_logs
      add constraint validation_logs_validation_mode_check
      check (validation_mode in ('manual', 'xml'));
  end if;
end
$$;

update public.validation_logs
set created_at = now()
where created_at is null;

alter table public.validation_logs
  alter column created_at set default now(),
  alter column created_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'validation_logs'
      and c.conname = 'validation_logs_user_id_fkey'
  ) then
    alter table public.validation_logs
      add constraint validation_logs_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end
$$;

alter table public.validation_logs
  alter column user_id set not null;

create index if not exists idx_validation_logs_user_created_at
  on public.validation_logs (user_id, created_at desc);

create index if not exists idx_validation_logs_created_at
  on public.validation_logs (created_at desc);

alter table public.validation_logs enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'validation_logs'
      and policyname = 'validation_logs_select_own'
  ) then
    create policy "validation_logs_select_own"
    on public.validation_logs
    for select
    to authenticated
    using (user_id = auth.uid());
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'validation_logs'
      and policyname = 'validation_logs_insert_own'
  ) then
    create policy "validation_logs_insert_own"
    on public.validation_logs
    for insert
    to authenticated
    with check (user_id = auth.uid());
  end if;
end
$$;

grant select, insert on public.validation_logs to authenticated;
