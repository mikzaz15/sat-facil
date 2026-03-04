-- Accepto MVP schema
-- Stack: Supabase Postgres (auth.users + RLS)

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Table: profiles
-- Purpose: app-level user profile mapped 1:1 to auth.users.
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamp with time zone not null default now()
);

-- -----------------------------------------------------------------------------
-- Table: workspaces
-- Purpose: tenant container for all business data.
-- -----------------------------------------------------------------------------
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone not null default now()
);

-- -----------------------------------------------------------------------------
-- Table: workspace_members
-- Purpose: membership + role map between users and workspaces.
-- -----------------------------------------------------------------------------
create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  primary key (workspace_id, user_id)
);

-- -----------------------------------------------------------------------------
-- Table: clients
-- Purpose: customers that belong to a workspace.
-- -----------------------------------------------------------------------------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text,
  email text,
  phone text,
  company text,
  created_at timestamp with time zone not null default now()
);

-- -----------------------------------------------------------------------------
-- Table: quotes
-- Purpose: quote headers and commercial totals for quote -> accept -> pay.
-- -----------------------------------------------------------------------------
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete restrict,
  status text not null check (status in ('draft', 'sent', 'accepted', 'deposit_paid', 'paid')),
  token text unique not null,
  subtotal numeric,
  tax numeric,
  discount numeric,
  total numeric,
  deposit_percent integer,
  created_at timestamp with time zone not null default now()
);

-- -----------------------------------------------------------------------------
-- Table: quote_items
-- Purpose: line items attached to a quote.
-- -----------------------------------------------------------------------------
create table if not exists public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  name text,
  qty integer,
  unit_price numeric
);

-- -----------------------------------------------------------------------------
-- Table: payments
-- Purpose: payment attempts/records for deposit or full quote payments.
-- -----------------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  stripe_session_id text,
  amount numeric,
  payment_type text check (payment_type in ('deposit', 'full')),
  status text,
  created_at timestamp with time zone not null default now()
);

-- Helpful indexes for common access patterns.
create index if not exists idx_workspace_members_user_id on public.workspace_members(user_id);
create index if not exists idx_clients_workspace_id on public.clients(workspace_id);
create index if not exists idx_quotes_workspace_id on public.quotes(workspace_id);
create index if not exists idx_quotes_client_id on public.quotes(client_id);
create index if not exists idx_quotes_token on public.quotes(token);
create index if not exists idx_quote_items_quote_id on public.quote_items(quote_id);
create index if not exists idx_payments_quote_id on public.payments(quote_id);

-- -----------------------------------------------------------------------------
-- RLS helpers
-- -----------------------------------------------------------------------------
create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
  );
$$;

create or replace function public.request_quote_token()
returns text
language sql
stable
as $$
  select nullif(
    coalesce(current_setting('request.headers', true), '{}')::json ->> 'x-quote-token',
    ''
  );
$$;

grant execute on function public.is_workspace_member(uuid) to authenticated, anon;
grant execute on function public.request_quote_token() to authenticated, anon;

-- -----------------------------------------------------------------------------
-- Enable RLS
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.clients enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.payments enable row level security;

-- -----------------------------------------------------------------------------
-- profiles policies
-- Users can only access/update their own profile row.
-- -----------------------------------------------------------------------------
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- -----------------------------------------------------------------------------
-- workspaces policies
-- Members can read/write only workspaces they belong to.
-- -----------------------------------------------------------------------------
create policy "workspaces_select_member"
on public.workspaces
for select
to authenticated
using (public.is_workspace_member(id));

create policy "workspaces_insert_owner"
on public.workspaces
for insert
to authenticated
with check (owner_id = auth.uid());

create policy "workspaces_update_member"
on public.workspaces
for update
to authenticated
using (public.is_workspace_member(id))
with check (public.is_workspace_member(id));

create policy "workspaces_delete_member"
on public.workspaces
for delete
to authenticated
using (public.is_workspace_member(id));

-- -----------------------------------------------------------------------------
-- workspace_members policies
-- Members can read/write membership rows in their workspaces.
-- Bootstrap exception: workspace owner can add their own initial membership row.
-- -----------------------------------------------------------------------------
create policy "workspace_members_select_member"
on public.workspace_members
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "workspace_members_insert_owner"
on public.workspace_members
for insert
to authenticated
with check (
  public.is_workspace_member(workspace_id)
  or (
    user_id = auth.uid()
    and exists (
      select 1
      from public.workspaces w
      where w.id = workspace_id
        and w.owner_id = auth.uid()
    )
  )
);

create policy "workspace_members_update_owner"
on public.workspace_members
for update
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "workspace_members_delete_owner"
on public.workspace_members
for delete
to authenticated
using (public.is_workspace_member(workspace_id));

-- -----------------------------------------------------------------------------
-- clients policies
-- Members can read/write clients in their workspaces.
-- -----------------------------------------------------------------------------
create policy "clients_select_member"
on public.clients
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "clients_insert_member"
on public.clients
for insert
to authenticated
with check (public.is_workspace_member(workspace_id));

create policy "clients_update_member"
on public.clients
for update
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "clients_delete_member"
on public.clients
for delete
to authenticated
using (public.is_workspace_member(workspace_id));

-- -----------------------------------------------------------------------------
-- quotes policies
-- Members can read/write quotes in their workspaces.
-- Public can read quote ONLY when x-quote-token header matches quotes.token.
-- -----------------------------------------------------------------------------
create policy "quotes_select_member"
on public.quotes
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "quotes_public_select_by_token"
on public.quotes
for select
to anon, authenticated
using (token = public.request_quote_token());

create policy "quotes_insert_member"
on public.quotes
for insert
to authenticated
with check (public.is_workspace_member(workspace_id));

create policy "quotes_update_member"
on public.quotes
for update
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "quotes_delete_member"
on public.quotes
for delete
to authenticated
using (public.is_workspace_member(workspace_id));

-- -----------------------------------------------------------------------------
-- quote_items policies
-- Access follows the parent quote's workspace membership.
-- -----------------------------------------------------------------------------
create policy "quote_items_select_member"
on public.quote_items
for select
to authenticated
using (
  exists (
    select 1
    from public.quotes q
    where q.id = quote_id
      and public.is_workspace_member(q.workspace_id)
  )
);

create policy "quote_items_insert_member"
on public.quote_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.quotes q
    where q.id = quote_id
      and public.is_workspace_member(q.workspace_id)
  )
);

create policy "quote_items_update_member"
on public.quote_items
for update
to authenticated
using (
  exists (
    select 1
    from public.quotes q
    where q.id = quote_id
      and public.is_workspace_member(q.workspace_id)
  )
)
with check (
  exists (
    select 1
    from public.quotes q
    where q.id = quote_id
      and public.is_workspace_member(q.workspace_id)
  )
);

create policy "quote_items_delete_member"
on public.quote_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.quotes q
    where q.id = quote_id
      and public.is_workspace_member(q.workspace_id)
  )
);

-- -----------------------------------------------------------------------------
-- payments policies
-- Access follows the parent quote's workspace membership.
-- -----------------------------------------------------------------------------
create policy "payments_select_member"
on public.payments
for select
to authenticated
using (
  exists (
    select 1
    from public.quotes q
    where q.id = quote_id
      and public.is_workspace_member(q.workspace_id)
  )
);

create policy "payments_insert_member"
on public.payments
for insert
to authenticated
with check (
  exists (
    select 1
    from public.quotes q
    where q.id = quote_id
      and public.is_workspace_member(q.workspace_id)
  )
);

create policy "payments_update_member"
on public.payments
for update
to authenticated
using (
  exists (
    select 1
    from public.quotes q
    where q.id = quote_id
      and public.is_workspace_member(q.workspace_id)
  )
)
with check (
  exists (
    select 1
    from public.quotes q
    where q.id = quote_id
      and public.is_workspace_member(q.workspace_id)
  )
);

create policy "payments_delete_member"
on public.payments
for delete
to authenticated
using (
  exists (
    select 1
    from public.quotes q
    where q.id = quote_id
      and public.is_workspace_member(q.workspace_id)
  )
);

-- -----------------------------------------------------------------------------
-- Table grants for Supabase API roles.
-- -----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.workspaces to authenticated;
grant select, insert, update, delete on public.workspace_members to authenticated;
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.quotes to authenticated;
grant select, insert, update, delete on public.quote_items to authenticated;
grant select, insert, update, delete on public.payments to authenticated;

grant select on public.quotes to anon;
