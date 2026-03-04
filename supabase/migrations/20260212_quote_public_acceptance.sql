-- Ensure quotes has the minimum fields/constraints needed for public token sharing.

alter table public.quotes
  add column if not exists accepted_at timestamp with time zone;

alter table public.quotes
  alter column token set not null;

alter table public.quotes
  alter column status set default 'draft';

alter table public.quotes
  alter column status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quotes_token_unique'
      and conrelid = 'public.quotes'::regclass
  ) then
    alter table public.quotes
      add constraint quotes_token_unique unique (token);
  end if;
end $$;

create index if not exists idx_quotes_token on public.quotes(token);
