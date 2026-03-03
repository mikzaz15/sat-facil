-- SAT Facil MVP schema

create extension if not exists pgcrypto;
create extension if not exists vector;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  phone text unique,
  plan text not null default 'free',
  created_at timestamp with time zone not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  channel text not null check (channel in ('web', 'whatsapp')),
  topic text,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.usage (
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null default current_date,
  messages_count integer not null default 0,
  flows_count integer not null default 0,
  primary key (user_id, date)
);

create table if not exists public.kb_sources (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  title text not null,
  publisher text not null,
  last_crawled_at timestamp with time zone not null default now()
);

create table if not exists public.kb_chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.kb_sources(id) on delete cascade,
  chunk_text text not null,
  embedding vector(1536),
  tags text[] not null default '{}'::text[]
);

create table if not exists public.flows (
  id text primary key,
  version integer not null default 1,
  questions_json jsonb not null
);

create table if not exists public.flow_runs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  flow_id text not null references public.flows(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  current_question_index integer not null default 0,
  answers_json jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (session_id, flow_id, status)
);

create index if not exists idx_sessions_user_id_created_at on public.sessions(user_id, created_at desc);
create index if not exists idx_messages_session_id_created_at on public.messages(session_id, created_at);
create index if not exists idx_kb_chunks_source_id on public.kb_chunks(source_id);
create index if not exists idx_kb_chunks_tags on public.kb_chunks using gin(tags);
create index if not exists idx_flow_runs_session on public.flow_runs(session_id, status);

create index if not exists idx_kb_chunks_embedding
  on public.kb_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_flow_runs_updated_at on public.flow_runs;
create trigger trg_flow_runs_updated_at
before update on public.flow_runs
for each row execute function public.set_updated_at();

create or replace function public.match_kb_chunks(
  query_embedding vector(1536),
  match_count integer default 5,
  filter_tags text[] default null
)
returns table (
  id uuid,
  source_id uuid,
  chunk_text text,
  tags text[],
  similarity double precision,
  url text,
  title text,
  publisher text
)
language sql
stable
as $$
  select
    c.id,
    c.source_id,
    c.chunk_text,
    c.tags,
    1 - (c.embedding <=> query_embedding) as similarity,
    s.url,
    s.title,
    s.publisher
  from public.kb_chunks c
  join public.kb_sources s on s.id = c.source_id
  where c.embedding is not null
    and (
      filter_tags is null
      or cardinality(filter_tags) = 0
      or c.tags && filter_tags
    )
  order by c.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

insert into public.flows (id, version, questions_json)
values
  (
    'FACTURAR',
    1,
    '[
      {"id":"persona_tipo","label":"¿Eres persona física o moral?"},
      {"id":"tipo_operacion","label":"¿Vas a facturar servicio o producto?"},
      {"id":"tipo_cliente","label":"¿Tu cliente es empresa o persona?"},
      {"id":"credenciales","label":"¿Tienes contraseña del SAT o e.firma?"}
    ]'::jsonb
  ),
  (
    'RESICO',
    1,
    '[
      {"id":"ingresos_rango","label":"¿Cuál es tu rango de ingresos aproximados?"},
      {"id":"tipo_ingresos","label":"¿Tus ingresos son por servicios, ventas, arrendamiento u otro?"},
      {"id":"nomina_adicional","label":"¿También tienes ingresos por nómina? (sí/no)"}
    ]'::jsonb
  ),
  (
    'BUZON',
    1,
    '[
      {"id":"recibio_aviso","label":"¿Recibiste aviso en Buzón Tributario? (sí/no)"},
      {"id":"puede_entrar_hoy","label":"¿Puedes entrar al buzón hoy? (sí/no)"},
      {"id":"requerimiento_multa","label":"¿El aviso menciona requerimiento o multa? (sí/no/no sé)"}
    ]'::jsonb
  ),
  (
    'DEVOLUCION',
    1,
    '[
      {"id":"perfil_ingresos","label":"¿Eres asalariado, freelance o mixto?"},
      {"id":"deducciones_cfdi","label":"¿Tienes deducciones con factura (CFDI)? (sí/no)"},
      {"id":"efirma","label":"¿Tienes e.firma vigente? (sí/no)"}
    ]'::jsonb
  )
on conflict (id)
do update set
  version = excluded.version,
  questions_json = excluded.questions_json;
