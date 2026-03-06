-- Hybrid retrieval support:
-- 1) Full-text search index on kb_chunks.chunk_text
-- 2) RPC function that returns FTS-ranked kb chunks with source metadata

create index if not exists idx_kb_chunks_chunk_text_fts
  on public.kb_chunks
  using gin (to_tsvector('spanish', coalesce(chunk_text, '')));

create or replace function public.match_kb_chunks_fts(
  query_text text,
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
  with ranked as (
    select
      c.id,
      c.source_id,
      c.chunk_text,
      c.tags,
      s.url,
      s.title,
      s.publisher,
      ts_rank_cd(
        to_tsvector('spanish', coalesce(c.chunk_text, '')),
        websearch_to_tsquery('spanish', coalesce(query_text, ''))
      ) as rank
    from public.kb_chunks c
    join public.kb_sources s on s.id = c.source_id
    where
      coalesce(trim(query_text), '') <> ''
      and to_tsvector('spanish', coalesce(c.chunk_text, ''))
          @@ websearch_to_tsquery('spanish', coalesce(query_text, ''))
      and (
        filter_tags is null
        or cardinality(filter_tags) = 0
        or c.tags && filter_tags
      )
  ),
  normalized as (
    select
      id,
      source_id,
      chunk_text,
      tags,
      url,
      title,
      publisher,
      case
        when max(rank) over () > 0 then rank / max(rank) over ()
        else 0
      end as similarity
    from ranked
  )
  select
    id,
    source_id,
    chunk_text,
    tags,
    similarity,
    url,
    title,
    publisher
  from normalized
  order by similarity desc, id
  limit greatest(match_count, 1);
$$;
