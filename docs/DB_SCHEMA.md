# Accepto MVP DB Schema

Stack assumption: Supabase Postgres with `auth.users` for authentication.

## Design Rules (MVP)
- UUID primary keys.
- `created_at`/`updated_at` on app tables.
- Strict workspace scoping on business data.
- Quote total is stored for payment integrity and recomputed in app when editing.

## 1) `workspaces`
Purpose: top-level account container.

Columns:
- `id uuid primary key default gen_random_uuid()`
- `name text not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Indexes:
- primary key on `id`

## 2) `profiles`
Purpose: map auth users to workspace and profile info.

Columns:
- `id uuid primary key references auth.users(id) on delete cascade`
- `workspace_id uuid not null references workspaces(id) on delete cascade`
- `full_name text`
- `email text not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Constraints:
- `unique (email)` (MVP simplification)

Indexes:
- `index profiles_workspace_id (workspace_id)`

## 3) `clients`
Purpose: customer records owned by a workspace.

Columns:
- `id uuid primary key default gen_random_uuid()`
- `workspace_id uuid not null references workspaces(id) on delete cascade`
- `name text not null`
- `email text not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Constraints:
- `unique (workspace_id, email)`

Indexes:
- `index clients_workspace_id (workspace_id)`

## 4) `quotes`
Purpose: quote header and lifecycle state.

Columns:
- `id uuid primary key default gen_random_uuid()`
- `workspace_id uuid not null references workspaces(id) on delete cascade`
- `client_id uuid not null references clients(id) on delete restrict`
- `title text not null`
- `note text`
- `currency text not null default 'USD'`
- `status text not null default 'draft'`
- `public_token text unique`
- `subtotal_cents integer not null default 0`
- `total_cents integer not null default 0`
- `sent_at timestamptz`
- `accepted_at timestamptz`
- `paid_at timestamptz`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Constraints:
- `check (status in ('draft','sent','accepted','paid'))`
- `check (subtotal_cents >= 0)`
- `check (total_cents >= 0)`

Indexes:
- `index quotes_workspace_id (workspace_id)`
- `index quotes_client_id (client_id)`
- `index quotes_status (status)`
- `index quotes_public_token (public_token)`

Notes:
- `public_token` is null while draft, set when sent.
- Token should be high-entropy random string.

## 5) `quote_items`
Purpose: line items belonging to a quote.

Columns:
- `id uuid primary key default gen_random_uuid()`
- `quote_id uuid not null references quotes(id) on delete cascade`
- `description text not null`
- `quantity numeric(10,2) not null`
- `unit_price_cents integer not null`
- `line_total_cents integer not null`
- `sort_order integer not null default 0`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Constraints:
- `check (quantity > 0)`
- `check (unit_price_cents >= 0)`
- `check (line_total_cents >= 0)`

Indexes:
- `index quote_items_quote_id (quote_id)`
- `index quote_items_quote_sort (quote_id, sort_order)`

## 6) `payments`
Purpose: track Stripe payment state for a quote.

Columns:
- `id uuid primary key default gen_random_uuid()`
- `workspace_id uuid not null references workspaces(id) on delete cascade`
- `quote_id uuid not null references quotes(id) on delete cascade`
- `stripe_checkout_session_id text unique`
- `stripe_payment_intent_id text unique`
- `amount_cents integer not null`
- `currency text not null default 'USD'`
- `status text not null default 'pending'`
- `paid_at timestamptz`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Constraints:
- `check (status in ('pending','paid','failed'))`
- `check (amount_cents >= 0)`
- `unique (quote_id)` (MVP: single payment per quote)

Indexes:
- `index payments_workspace_id (workspace_id)`
- `index payments_quote_id (quote_id)`
- `index payments_status (status)`

## Relationship Summary
- One `workspace` has many `profiles`, `clients`, `quotes`, `payments`.
- One `client` has many `quotes`.
- One `quote` has many `quote_items`.
- One `quote` has at most one `payment` in MVP.

## RLS Direction (MVP)
- Private tables (`clients`, `quotes`, `quote_items`, `payments`) filtered by `workspace_id` membership from `profiles`.
- Public quote read/accept/pay path should use token-based server actions/API handlers, not open table-wide public selects.
